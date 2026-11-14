# IG-S04 summary (provisional-r1, revision r2)

**provisional (pre-freeze): pilot figures on seeds 11 and 12, one sample per mode; they decide neither S1 nor the bank route, enable no cell and are not a gate result**

Formal gate: **not-evaluable-pre-freeze**. Evidence status: **provisional (pre-freeze)**.

## Coverage

| planned | started | completed | censored (45 s guard) | sample-budget | errors | unstarted |
|---|---|---|---|---|---|---|
| 64 | 64 | 64 | 0 | 0 | 0 | 0 |

Unstarted keys are inconclusive: they are not zero-cost trials and not censored observations.

History: the first summary (r1) was written with 58 of 64 keys started, i.e. 6 unstarted keys (its coverage header showed 2, because a shard that never started has no records). The 6 keys were started after the orchestrator approved the extension: s5-large-reference/samurai:nightmare:12/FS (complete); s5-large-reference/samurai:nightmare:12/FU (complete); s6-large-s2-control/mega16:nightmare:11/F0 (complete); s6-large-s2-control/mega16:nightmare:12/F0 (complete); s6-large-s2-control/samurai:nightmare:11/F0 (complete); s6-large-s2-control/samurai:nightmare:12/F0 (complete).

## Cost and exact hits per cell and mode (descriptive: one sample per mode and grid, grids 11 and 12)

| cell | mode | started | complete | censored | budget | err | unstarted | claimed | verified hits | ready wall ms mean | max | cpu ms mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mega16 | proposal-only | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 911.20 | 1151.70 | 1140.50 |
| mega16 | ordinary-only | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 8525.70 | 9790.80 | 8789 |
| mega16 | F0 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 193.10 | 295.40 | 328 |
| mega16 | F1 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 163.80 | 238.20 | 344 |
| mega16 | FC | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 353.20 | 624.70 | 522.50 |
| mega16 | FM | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 377.40 | 641.90 | 539.50 |
| mega16 | FU | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 173.50 | 259.30 | 312 |
| mega16 | FS | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 179.30 | 257.60 | 390.50 |
| samurai | proposal-only | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 288.70 | 488 | 484 |
| samurai | ordinary-only | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 417.60 | 502.30 | 664 |
| samurai | F0 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 164.30 | 188.70 | 360.50 |
| samurai | F1 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 143.70 | 164.70 | 336 |
| samurai | FC | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 1493 | 2771.60 | 1781 |
| samurai | FM | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 1523.50 | 2788.10 | 1945.50 |
| samurai | FU | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 145.40 | 168.50 | 336.50 |
| samurai | FS | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 159.30 | 173.90 | 406 |
| classic9 | proposal-only | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 23.40 | 24.10 | 39 |
| classic9 | ordinary-only | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 149.90 | 241.80 | 274 |
| classic9 | F0 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 25.10 | 26.10 | 46 |
| classic9 | F1 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 26.30 | 28.10 | 70.50 |
| classic9 | FC | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 26 | 27.70 | 70 |
| classic9 | FM | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 29.80 | 32.10 | 62.50 |
| classic9 | FU | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 25.60 | 27.10 | 55 |
| classic9 | FS | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 26.30 | 29.70 | 78 |
| mega12 | proposal-only | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 125 | 156.50 | 304.50 |
| mega12 | ordinary-only | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 638.90 | 759.70 | 985 |
| mega12 | F0 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 2521.30 | 4897.80 | 2680.50 |
| mega12 | F1 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 2559.90 | 4998.30 | 2804 |
| mega12 | FC | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 2525.10 | 4915.30 | 2774.50 |
| mega12 | FM | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 2542.30 | 4945.10 | 2734.50 |
| mega12 | FU | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 91.60 | 126.60 | 250 |
| mega12 | FS | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 2547.40 | 4964.50 | 2750 |

Hits per CPU second and per ready wall second divide the verified hits by all spent ready-interval work of the started trials (censored ones included); n is two grids per mode and cell, so these are not rates to compare.

| cell | mode | verified hits | hits / CPU s | hits / ready wall s |
|---|---|---|---|---|
| mega16 | proposal-only | 0 | 0 | 0 |
| mega16 | ordinary-only | 0 | 0 | 0 |
| mega16 | F0 | 0 | 0 | 0 |
| mega16 | F1 | 0 | 0 | 0 |
| mega16 | FC | 0 | 0 | 0 |
| mega16 | FM | 0 | 0 | 0 |
| mega16 | FU | 0 | 0 | 0 |
| mega16 | FS | 0 | 0 | 0 |
| samurai | proposal-only | 0 | 0 | 0 |
| samurai | ordinary-only | 0 | 0 | 0 |
| samurai | F0 | 0 | 0 | 0 |
| samurai | F1 | 0 | 0 | 0 |
| samurai | FC | 0 | 0 | 0 |
| samurai | FM | 0 | 0 | 0 |
| samurai | FU | 0 | 0 | 0 |
| samurai | FS | 0 | 0 | 0 |
| classic9 | proposal-only | 0 | 0 | 0 |
| classic9 | ordinary-only | 0 | 0 | 0 |
| classic9 | F0 | 0 | 0 | 0 |
| classic9 | F1 | 0 | 0 | 0 |
| classic9 | FC | 0 | 0 | 0 |
| classic9 | FM | 0 | 0 | 0 |
| classic9 | FU | 0 | 0 | 0 |
| classic9 | FS | 0 | 0 | 0 |
| mega12 | proposal-only | 0 | 0 | 0 |
| mega12 | ordinary-only | 0 | 0 | 0 |
| mega12 | F0 | 0 | 0 | 0 |
| mega12 | F1 | 0 | 0 | 0 |
| mega12 | FC | 0 | 0 | 0 |
| mega12 | FM | 0 | 0 | 0 |
| mega12 | FU | 0 | 0 | 0 |
| mega12 | FS | 0 | 0 | 0 |

## Budget parts per sample (mean over the completed trials; null where a native arm has no such part)

"phaseB tries" are the attempted entries (at most K_F = 12); "phaseB solves" are the allowed-set solves, only the attempts that passed the fresh uniqueness proof (and the FU filter, whose own solves are counted apart).

| cell | mode | floor tests | floor deductions | logical checks | DFS entries | DFS checks | ladder passes | phaseB tries | FU filter solves | phaseB solves | deepen proposals | verification solves |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mega16 | proposal-only | n/a | n/a | 341559 | 22245 | 22189 | n/a | n/a | n/a | n/a | n/a | 10 |
| mega16 | ordinary-only | n/a | n/a | 2629064 | 31.50 | 30.50 | n/a | n/a | n/a | n/a | n/a | 1 |
| mega16 | F0 | 133 | 9016.50 | 61035 | 6052 | 5947 | 3 | 0 | 0 | 0 | 0 | 1 |
| mega16 | F1 | 133 | 6880.50 | 58603 | 6052 | 5947 | 3 | 0 | 0 | 0 | 0 | 1 |
| mega16 | FC | 128 | 6603 | 159042 | 5908 | 5805 | 1 | 3.50 | 0 | 1.50 | 0 | 2.50 |
| mega16 | FM | 128 | 6630.50 | 169048.50 | 5908 | 5805 | 1 | 3.50 | 0 | 1.50 | 0 | 2.50 |
| mega16 | FU | 133 | 6880.50 | 58603 | 6052 | 5947 | 3 | 0 | 0 | 0 | 0 | 1 |
| mega16 | FS | 133 | 6880.50 | 58603 | 6052 | 5947 | 3 | 0 | 0 | 0 | 0 | 1 |
| samurai | proposal-only | n/a | n/a | 306594 | 1336.50 | 1282 | n/a | n/a | n/a | n/a | n/a | 5 |
| samurai | ordinary-only | n/a | n/a | 445090.50 | 14.50 | 13.50 | n/a | n/a | n/a | n/a | n/a | 1 |
| samurai | F0 | 188 | 27890.50 | 185043.50 | 696.50 | 589.50 | 3 | 0 | 0 | 0 | 0 | 1 |
| samurai | F1 | 188 | 21940.50 | 164043 | 696.50 | 589.50 | 3 | 0 | 0 | 0 | 0 | 1 |
| samurai | FC | 185 | 21465.50 | 787521 | 696.50 | 589.50 | 1 | 2 | 0 | 1 | 8 | 2 |
| samurai | FM | 185 | 21469 | 802270 | 696.50 | 589.50 | 1 | 2 | 0 | 1 | 8 | 2 |
| samurai | FU | 188 | 21940.50 | 164043 | 696.50 | 589.50 | 3 | 0 | 0 | 0 | 0 | 1 |
| samurai | FS | 188 | 21940.50 | 164043 | 696.50 | 589.50 | 3 | 0 | 0 | 0 | 0 | 1 |
| classic9 | proposal-only | n/a | n/a | 1880 | 28.50 | 13 | n/a | n/a | n/a | n/a | n/a | 1 |
| classic9 | ordinary-only | n/a | n/a | 52894 | 1 | 0 | n/a | n/a | n/a | n/a | n/a | 1 |
| classic9 | F0 | 41 | 1202 | 3925 | 66.50 | 40.50 | 3 | 0 | 0 | 0 | 0 | 1 |
| classic9 | F1 | 41 | 986 | 3709 | 66.50 | 40.50 | 3 | 0 | 0 | 0 | 0 | 1 |
| classic9 | FC | 41 | 986 | 3709 | 66.50 | 40.50 | 1 | 0 | 0 | 0 | 0 | 1 |
| classic9 | FM | 41 | 987.50 | 4809 | 66.50 | 40.50 | 1 | 0 | 0 | 0 | 0 | 1 |
| classic9 | FU | 41 | 986 | 3709 | 66.50 | 40.50 | 3 | 0 | 0 | 0 | 0 | 1 |
| classic9 | FS | 41 | 986 | 3709 | 66.50 | 40.50 | 3 | 0 | 0 | 0 | 0 | 1 |
| mega12 | proposal-only | n/a | n/a | 55643.50 | 120 | 88 | n/a | n/a | n/a | n/a | n/a | 5.50 |
| mega12 | ordinary-only | n/a | n/a | 348556.50 | 6.50 | 5.50 | n/a | n/a | n/a | n/a | n/a | 1 |
| mega12 | F0 | 77.50 | 3458.50 | 663796 | 232 | 170 | 3 | 1.50 | 0 | 1 | 8 | 2 |
| mega12 | F1 | 77.50 | 2890.50 | 663228 | 232 | 170 | 3 | 1.50 | 0 | 1 | 8 | 2 |
| mega12 | FC | 72 | 2682.50 | 667141 | 197 | 138.50 | 1 | 3.50 | 0 | 2 | 8 | 3 |
| mega12 | FM | 72 | 2724 | 672754 | 197 | 138.50 | 1 | 3.50 | 0 | 2 | 8 | 3 |
| mega12 | FU | 77.50 | 2951 | 43364.50 | 232 | 170 | 3 | 1.50 | 1 | 0.50 | 0 | 1.50 |
| mega12 | FS | 77.50 | 2890.50 | 664529 | 214 | 152.50 | 3 | 1.50 | 0 | 1.50 | 8 | 2.50 |

## Paired comparisons (same grid; not multiplied)

| grid | comparison | purpose | outcomes | wall ratio | floor-deduction ratio | hit a | hit b |
|---|---|---|---|---|---|---|---|
| mega16:11 | F0 / F1 | isolated S2 comparison | complete / complete | 1.24 | 1.27 | false | false |
| mega16:11 | FC / F1 | floor choice | complete / complete | 2.62 | 0.93 | false | false |
| mega16:11 | FM / F1 | floor choice | complete / complete | 2.69 | 0.93 | false | false |
| mega16:11 | FU / F1 | uniqueness filter | complete / complete | 1.09 | 1 | false | false |
| mega16:11 | FS / F1 | reference-parent choice | complete / complete | 1.08 | 1 | false | false |
| samurai:11 | F0 / F1 | isolated S2 comparison | complete / complete | 1.14 | 1.28 | false | false |
| samurai:11 | FC / F1 | floor choice | complete / complete | 22.57 | 0.97 | false | false |
| samurai:11 | FM / F1 | floor choice | complete / complete | 22.71 | 0.97 | false | false |
| samurai:11 | FU / F1 | uniqueness filter | complete / complete | 1.00 | 1 | false | false |
| samurai:11 | FS / F1 | reference-parent choice | complete / complete | 1.18 | 1 | false | false |
| classic9:11 | F0 / F1 | isolated S2 comparison | complete / complete | 0.93 | 1.23 | false | false |
| classic9:11 | FC / F1 | floor choice | complete / complete | 0.99 | 1 | false | false |
| classic9:11 | FM / F1 | floor choice | complete / complete | 1.14 | 1.00 | false | false |
| classic9:11 | FU / F1 | uniqueness filter | complete / complete | 0.97 | 1 | false | false |
| classic9:11 | FS / F1 | reference-parent choice | complete / complete | 1.06 | 1 | false | false |
| classic9:12 | F0 / F1 | isolated S2 comparison | complete / complete | 0.98 | 1.21 | false | false |
| classic9:12 | FC / F1 | floor choice | complete / complete | 0.99 | 1 | false | false |
| classic9:12 | FM / F1 | floor choice | complete / complete | 1.12 | 1 | false | false |
| classic9:12 | FU / F1 | uniqueness filter | complete / complete | 0.98 | 1 | false | false |
| classic9:12 | FS / F1 | reference-parent choice | complete / complete | 0.93 | 1 | false | false |
| mega12:11 | F0 / F1 | isolated S2 comparison | complete / complete | 0.98 | 1.21 | false | false |
| mega12:11 | FC / F1 | floor choice | complete / complete | 0.98 | 0.97 | false | false |
| mega12:11 | FM / F1 | floor choice | complete / complete | 0.99 | 0.97 | false | false |
| mega12:11 | FU / F1 | uniqueness filter | complete / complete | 0.01 | 1.03 | false | false |
| mega12:11 | FS / F1 | reference-parent choice | complete / complete | 0.99 | 1 | false | false |
| mega12:12 | F0 / F1 | isolated S2 comparison | complete / complete | 1.19 | 1.18 | false | false |
| mega12:12 | FC / F1 | floor choice | complete / complete | 1.11 | 0.89 | false | false |
| mega12:12 | FM / F1 | floor choice | complete / complete | 1.15 | 0.92 | false | false |
| mega12:12 | FU / F1 | uniqueness filter | complete / complete | 1.04 | 1.01 | false | false |
| mega12:12 | FS / F1 | reference-parent choice | complete / complete | 1.07 | 1 | false | false |
| mega16:12 | F0 / F1 | isolated S2 comparison | complete / complete | 1.02 | 1.35 | false | false |
| mega16:12 | FC / F1 | floor choice | complete / complete | 0.91 | 0.99 | false | false |
| mega16:12 | FM / F1 | floor choice | complete / complete | 1.26 | 1.00 | false | false |
| mega16:12 | FU / F1 | uniqueness filter | complete / complete | 0.98 | 1 | false | false |
| mega16:12 | FS / F1 | reference-parent choice | complete / complete | 1.13 | 1 | false | false |
| samurai:12 | F0 / F1 | isolated S2 comparison | complete / complete | 1.15 | 1.27 | false | false |
| samurai:12 | FC / F1 | floor choice | complete / complete | 1.30 | 0.98 | false | false |
| samurai:12 | FM / F1 | floor choice | complete / complete | 1.57 | 0.98 | false | false |
| samurai:12 | FU / F1 | uniqueness filter | complete / complete | 1.02 | 1 | false | false |
| samurai:12 | FS / F1 | reference-parent choice | complete / complete | 1.06 | 1 | false | false |

## Budgets (budgets-r2.json, hash f0a0c422032765250d4b8f5daa5f2cfb9c30dc8dcb7ebceab8036bd87a44c755)

| cell | status | problems |
|---|---|---|
| mega16 | fitted | none |
| samurai | fitted | none |
| classic9 | fitted | none |
| mega12 | fitted | none |

| cell | floor tests | ladder passes | phaseB solves | deepen proposals | canonical ratings | floor deductions | logical checks | DFS entries | DFS checks |
|---|---|---|---|---|---|---|---|---|---|
| mega16 | 384 | 3 | 12 | 16 | 64 | 32768 | 1048576 | 32768 | 32768 |
| samurai | 555 | 3 | 12 | 16 | 64 | 65536 | 4194304 | 2048 | 2048 |
| classic9 | 123 | 3 | 12 | 16 | 64 | 4096 | 16384 | 256 | 128 |
| mega12 | 216 | 3 | 12 | 16 | 64 | 8192 | 4194304 | 1024 | 512 |

## Corrections of revision r2: did a completed trial exercise the affected branch?

Every trial of this pilot ran the code before the corrections; the table reads their records (48 completed frontier trials).

| correction | branch | evidence in the completed trials | exercised |
|---|---|---|---|
| 1 last executed rung only | an earlier-rung entry reaching phase B | trials with such an entry 0, such a try 0; trials with a later-pass clue/unit skip 0 | false |
| 2 unsupported objective | a non-numeric objective in deepen | 7 deepen runs, 0 with a non-numeric objective | false |
| 3 contradiction after proved uniqueness | an allowed-set solve ending other than solved or stuck | 26 allowed-set solves: 26 solved, 0 stuck, 0 contradiction, 0 other | false |
| 5 attempts versus solves | K_F = 12 attempts and allowed-set solves (wording and report only) | 48 phase-B tries, 26 allowed-set solves, 2 FU filter solves; trials at K_F: 0 | n/a |

None of the corrected branches (1, 2, 3) was reached by a completed trial, so no completed trial record changes. Corrections 4 (the declared restriction), 5 (the attempts-versus-solves wording and columns), 6 (the coverage header) and 7 (the wording) are documentation and reporting only.

## Self-tests after the corrections

Pure cases: 41/41 passed. Engine cases rerun in one wrapped command (engine-retest-r2.json): 15/15 passed; the parity run is not touched by the corrections (hooks and adapter unchanged) and was not repeated.

## S2 audit

| trials audited | accepted removals | S2 re-derived | audited removals | operational disagreements | correctness problems |
|---|---|---|---|---|---|
| 48 | 3388 | 2652 | 120 | 0 | 0 |

## Machine time

Allocation 720 s plus 330 s approved by the orchestrator (cap 1050 s), charged 828.33 s over 16 commands (occupied wrapper time + 45 s grace each), remaining 221.67 s; priority waits 1318.53 s, not charged.

## Projection for IG-S05 (a projection, not a measurement)

```json
{
  "remainingPopulation": {
    "keys": 58,
    "shards": [
      {
        "shard": "s2-small-all",
        "keys": 32,
        "observedScenarioMs": 37082,
        "observedScenarioPartialMs": 37082,
        "observedScenarioComplete": true,
        "observedScenarioChargedMs": 82082,
        "ceilingScenarioMs": 1696000,
        "ceilingScenarioChargedMs": 2011000,
        "rows": [
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:11/proposal-only",
            "cell": "classic9",
            "mode": "proposal-only",
            "estimateMs": 4000,
            "projectedMs": 215.3,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:11/ordinary-only",
            "cell": "classic9",
            "mode": "ordinary-only",
            "estimateMs": 5000,
            "projectedMs": 342.3,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:11/F0",
            "cell": "classic9",
            "mode": "F0",
            "estimateMs": 12000,
            "projectedMs": 305,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:11/F1",
            "cell": "classic9",
            "mode": "F1",
            "estimateMs": 12000,
            "projectedMs": 309.5,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:11/FC",
            "cell": "classic9",
            "mode": "FC",
            "estimateMs": 12000,
            "projectedMs": 311,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:11/FM",
            "cell": "classic9",
            "mode": "FM",
            "estimateMs": 12000,
            "projectedMs": 330.7,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:11/FU",
            "cell": "classic9",
            "mode": "FU",
            "estimateMs": 12000,
            "projectedMs": 310.2,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:11/FS",
            "cell": "classic9",
            "mode": "FS",
            "estimateMs": 12000,
            "projectedMs": 310.8,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:12/ordinary-only",
            "cell": "classic9",
            "mode": "ordinary-only",
            "estimateMs": 5000,
            "projectedMs": 342.3,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:12/F0",
            "cell": "classic9",
            "mode": "F0",
            "estimateMs": 12000,
            "projectedMs": 305,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:12/F1",
            "cell": "classic9",
            "mode": "F1",
            "estimateMs": 12000,
            "projectedMs": 309.5,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:12/FC",
            "cell": "classic9",
            "mode": "FC",
            "estimateMs": 12000,
            "projectedMs": 311,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:12/FM",
            "cell": "classic9",
            "mode": "FM",
            "estimateMs": 12000,
            "projectedMs": 330.7,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:12/FU",
            "cell": "classic9",
            "mode": "FU",
            "estimateMs": 12000,
            "projectedMs": 310.2,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:12/FS",
            "cell": "classic9",
            "mode": "FS",
            "estimateMs": 12000,
            "projectedMs": 310.8,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/classic9:nightmare:12/proposal-only",
            "cell": "classic9",
            "mode": "proposal-only",
            "estimateMs": 4000,
            "projectedMs": 215.3,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:11/proposal-only",
            "cell": "mega12",
            "mode": "proposal-only",
            "estimateMs": 8000,
            "projectedMs": 362,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:11/ordinary-only",
            "cell": "mega12",
            "mode": "ordinary-only",
            "estimateMs": 16000,
            "projectedMs": 888.4,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:11/F0",
            "cell": "mega12",
            "mode": "F0",
            "estimateMs": 34000,
            "projectedMs": 2884.3,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:11/F1",
            "cell": "mega12",
            "mode": "F1",
            "estimateMs": 34000,
            "projectedMs": 2919.7,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:11/FC",
            "cell": "mega12",
            "mode": "FC",
            "estimateMs": 34000,
            "projectedMs": 2847.9,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:11/FM",
            "cell": "mega12",
            "mode": "FM",
            "estimateMs": 34000,
            "projectedMs": 2858.9,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:11/FU",
            "cell": "mega12",
            "mode": "FU",
            "estimateMs": 34000,
            "projectedMs": 438.4,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:11/FS",
            "cell": "mega12",
            "mode": "FS",
            "estimateMs": 34000,
            "projectedMs": 2906.5,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:12/ordinary-only",
            "cell": "mega12",
            "mode": "ordinary-only",
            "estimateMs": 16000,
            "projectedMs": 888.4,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:12/F0",
            "cell": "mega12",
            "mode": "F0",
            "estimateMs": 34000,
            "projectedMs": 2884.3,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:12/F1",
            "cell": "mega12",
            "mode": "F1",
            "estimateMs": 34000,
            "projectedMs": 2919.7,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:12/FC",
            "cell": "mega12",
            "mode": "FC",
            "estimateMs": 34000,
            "projectedMs": 2847.9,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:12/FM",
            "cell": "mega12",
            "mode": "FM",
            "estimateMs": 34000,
            "projectedMs": 2858.9,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:12/FU",
            "cell": "mega12",
            "mode": "FU",
            "estimateMs": 34000,
            "projectedMs": 438.4,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:12/FS",
            "cell": "mega12",
            "mode": "FS",
            "estimateMs": 34000,
            "projectedMs": 2906.5,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s2-small-all/mega12:nightmare:12/proposal-only",
            "cell": "mega12",
            "mode": "proposal-only",
            "estimateMs": 8000,
            "projectedMs": 362,
            "basis": "observed: same cell and mode (2 trials)"
          }
        ]
      },
      {
        "shard": "s3-large-native-f1",
        "keys": 6,
        "observedScenarioMs": 12200,
        "observedScenarioPartialMs": 12200,
        "observedScenarioComplete": true,
        "observedScenarioChargedMs": 57200,
        "ceilingScenarioMs": 318000,
        "ceilingScenarioChargedMs": 408000,
        "rows": [
          {
            "key": "IG-S04/s3-large-native-f1/mega16:nightmare:12/ordinary-only",
            "cell": "mega16",
            "mode": "ordinary-only",
            "estimateMs": 32000,
            "projectedMs": 8808.8,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s3-large-native-f1/mega16:nightmare:12/F1",
            "cell": "mega16",
            "mode": "F1",
            "estimateMs": 62000,
            "projectedMs": 490.3,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s3-large-native-f1/mega16:nightmare:12/proposal-only",
            "cell": "mega16",
            "mode": "proposal-only",
            "estimateMs": 14000,
            "projectedMs": 1182.5,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s3-large-native-f1/samurai:nightmare:12/ordinary-only",
            "cell": "samurai",
            "mode": "ordinary-only",
            "estimateMs": 32000,
            "projectedMs": 641.1,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s3-large-native-f1/samurai:nightmare:12/F1",
            "cell": "samurai",
            "mode": "F1",
            "estimateMs": 62000,
            "projectedMs": 546.6,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s3-large-native-f1/samurai:nightmare:12/proposal-only",
            "cell": "samurai",
            "mode": "proposal-only",
            "estimateMs": 14000,
            "projectedMs": 531,
            "basis": "observed: same cell and mode (2 trials)"
          }
        ]
      },
      {
        "shard": "s4-large-floors",
        "keys": 8,
        "observedScenarioMs": 10381,
        "observedScenarioPartialMs": 10381,
        "observedScenarioComplete": true,
        "observedScenarioChargedMs": 55381,
        "ceilingScenarioMs": 424000,
        "ceilingScenarioChargedMs": 514000,
        "rows": [
          {
            "key": "IG-S04/s4-large-floors/mega16:nightmare:11/FC",
            "cell": "mega16",
            "mode": "FC",
            "estimateMs": 62000,
            "projectedMs": 700.1,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s4-large-floors/mega16:nightmare:11/FM",
            "cell": "mega16",
            "mode": "FM",
            "estimateMs": 62000,
            "projectedMs": 717.4,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s4-large-floors/mega16:nightmare:12/FM",
            "cell": "mega16",
            "mode": "FM",
            "estimateMs": 62000,
            "projectedMs": 717.4,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s4-large-floors/mega16:nightmare:12/FC",
            "cell": "mega16",
            "mode": "FC",
            "estimateMs": 62000,
            "projectedMs": 700.1,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s4-large-floors/samurai:nightmare:11/FC",
            "cell": "samurai",
            "mode": "FC",
            "estimateMs": 62000,
            "projectedMs": 1870.2,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s4-large-floors/samurai:nightmare:11/FM",
            "cell": "samurai",
            "mode": "FM",
            "estimateMs": 62000,
            "projectedMs": 1902.7,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s4-large-floors/samurai:nightmare:12/FM",
            "cell": "samurai",
            "mode": "FM",
            "estimateMs": 62000,
            "projectedMs": 1902.7,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s4-large-floors/samurai:nightmare:12/FC",
            "cell": "samurai",
            "mode": "FC",
            "estimateMs": 62000,
            "projectedMs": 1870.2,
            "basis": "observed: same cell and mode (2 trials)"
          }
        ]
      },
      {
        "shard": "s5-large-reference",
        "keys": 8,
        "observedScenarioMs": 4360,
        "observedScenarioPartialMs": 4360,
        "observedScenarioComplete": true,
        "observedScenarioChargedMs": 49360,
        "ceilingScenarioMs": 424000,
        "ceilingScenarioChargedMs": 514000,
        "rows": [
          {
            "key": "IG-S04/s5-large-reference/mega16:nightmare:11/FU",
            "cell": "mega16",
            "mode": "FU",
            "estimateMs": 62000,
            "projectedMs": 512,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s5-large-reference/mega16:nightmare:11/FS",
            "cell": "mega16",
            "mode": "FS",
            "estimateMs": 62000,
            "projectedMs": 522.4,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s5-large-reference/mega16:nightmare:12/FS",
            "cell": "mega16",
            "mode": "FS",
            "estimateMs": 62000,
            "projectedMs": 522.4,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s5-large-reference/mega16:nightmare:12/FU",
            "cell": "mega16",
            "mode": "FU",
            "estimateMs": 62000,
            "projectedMs": 512,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s5-large-reference/samurai:nightmare:11/FU",
            "cell": "samurai",
            "mode": "FU",
            "estimateMs": 62000,
            "projectedMs": 560,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s5-large-reference/samurai:nightmare:11/FS",
            "cell": "samurai",
            "mode": "FS",
            "estimateMs": 62000,
            "projectedMs": 585.6,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s5-large-reference/samurai:nightmare:12/FS",
            "cell": "samurai",
            "mode": "FS",
            "estimateMs": 62000,
            "projectedMs": 585.6,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s5-large-reference/samurai:nightmare:12/FU",
            "cell": "samurai",
            "mode": "FU",
            "estimateMs": 62000,
            "projectedMs": 560,
            "basis": "observed: same cell and mode (2 trials)"
          }
        ]
      },
      {
        "shard": "s6-large-s2-control",
        "keys": 4,
        "observedScenarioMs": 2180,
        "observedScenarioPartialMs": 2180,
        "observedScenarioComplete": true,
        "observedScenarioChargedMs": 47180,
        "ceilingScenarioMs": 212000,
        "ceilingScenarioChargedMs": 257000,
        "rows": [
          {
            "key": "IG-S04/s6-large-s2-control/mega16:nightmare:11/F0",
            "cell": "mega16",
            "mode": "F0",
            "estimateMs": 62000,
            "projectedMs": 533.7,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s6-large-s2-control/mega16:nightmare:12/F0",
            "cell": "mega16",
            "mode": "F0",
            "estimateMs": 62000,
            "projectedMs": 533.7,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s6-large-s2-control/samurai:nightmare:11/F0",
            "cell": "samurai",
            "mode": "F0",
            "estimateMs": 62000,
            "projectedMs": 556.1,
            "basis": "observed: same cell and mode (2 trials)"
          },
          {
            "key": "IG-S04/s6-large-s2-control/samurai:nightmare:12/F0",
            "cell": "samurai",
            "mode": "F0",
            "estimateMs": 62000,
            "projectedMs": 556.1,
            "basis": "observed: same cell and mode (2 trials)"
          }
        ]
      }
    ],
    "observedScenarioPartialMs": 66203,
    "observedScenarioComplete": true,
    "ceilingScenarioChargedMs": 3704000,
    "verdict": "the guard-ceiling scenario does NOT fit the remaining allocation: the pilot is staged and possibly partial, unreached keys stay unstarted/inconclusive (never zero-cost or censored observations)"
  },
  "igS05PrimaryTier": {
    "population": "8 grid seeds per cell x proposal-only, ordinary-only and F1 x at most 2 samples per mode and grid, per cell",
    "cells": {
      "classic9": {
        "modes": {
          "proposal-only": {
            "perSampleMs": 215.3,
            "basis": "observed: same cell and mode (2 trials)",
            "upperBoundMs": 3445,
            "guardCeilingMs": 848000
          },
          "ordinary-only": {
            "perSampleMs": 342.3,
            "basis": "observed: same cell and mode (2 trials)",
            "upperBoundMs": 5477,
            "guardCeilingMs": 848000
          },
          "F1": {
            "perSampleMs": 309.5,
            "basis": "observed: same cell and mode (2 trials)",
            "upperBoundMs": 4952,
            "guardCeilingMs": 848000
          }
        },
        "observedScenarioMs": 13874,
        "guardCeilingMs": 2544000
      },
      "mega12": {
        "modes": {
          "proposal-only": {
            "perSampleMs": 362,
            "basis": "observed: same cell and mode (2 trials)",
            "upperBoundMs": 5792,
            "guardCeilingMs": 848000
          },
          "ordinary-only": {
            "perSampleMs": 888.4,
            "basis": "observed: same cell and mode (2 trials)",
            "upperBoundMs": 14215,
            "guardCeilingMs": 848000
          },
          "F1": {
            "perSampleMs": 2919.7,
            "basis": "observed: same cell and mode (2 trials)",
            "upperBoundMs": 46715,
            "guardCeilingMs": 848000
          }
        },
        "observedScenarioMs": 66722,
        "guardCeilingMs": 2544000
      },
      "mega16": {
        "modes": {
          "proposal-only": {
            "perSampleMs": 1182.5,
            "basis": "observed: same cell and mode (2 trials)",
            "upperBoundMs": 18920,
            "guardCeilingMs": 848000
          },
          "ordinary-only": {
            "perSampleMs": 8808.8,
            "basis": "observed: same cell and mode (2 trials)",
            "upperBoundMs": 140942,
            "guardCeilingMs": 848000
          },
          "F1": {
            "perSampleMs": 490.3,
            "basis": "observed: same cell and mode (2 trials)",
            "upperBoundMs": 7845,
            "guardCeilingMs": 848000
          }
        },
        "observedScenarioMs": 167707,
        "guardCeilingMs": 2544000
      },
      "samurai": {
        "modes": {
          "proposal-only": {
            "perSampleMs": 531,
            "basis": "observed: same cell and mode (2 trials)",
            "upperBoundMs": 8496,
            "guardCeilingMs": 848000
          },
          "ordinary-only": {
            "perSampleMs": 641.1,
            "basis": "observed: same cell and mode (2 trials)",
            "upperBoundMs": 10258,
            "guardCeilingMs": 848000
          },
          "F1": {
            "perSampleMs": 546.6,
            "basis": "observed: same cell and mode (2 trials)",
            "upperBoundMs": 8745,
            "guardCeilingMs": 848000
          }
        },
        "observedScenarioMs": 27499,
        "guardCeilingMs": 2544000
      }
    },
    "note": "per-sample costs are the machine time of one pilot trial (cold start to cleanup, verifier and audit); a null cost is an unmeasured cell and mode, reported as such, never as zero"
  },
  "allocation": {
    "taskAllocationMs": 1050000,
    "chargedBeforeThisCommandMs": 828329,
    "chargedWithThisCommandMs": 828329,
    "remainingMs": 221671,
    "note": "charged = occupied wrapper time + 45 s quiet-admission grace per command; priority waits are not charged"
  },
  "note": "recomputed from all pilot records at the end of the task"
}
```

## Acceptance criteria

| id | status | evidence |
|---|---|---|
| B01 | met | variant-manifest.json lists the eight modes with floors, S2, parent, filter, forks, budgets and every interpretation; nothing is adopted silently |
| B02 | met | every frontier record carries floor tests by rung, DFS entries/checks, ladder passes, phaseB solves, deepen proposals and verification solves; refused-test DFS is in the per-phase cost (phaseA includes it) |
| B03 | met | every document says provisional (pre-freeze); no variant, S1 or bank decision is made |
| T01 | met | frontier-test.cjs: pure cases (fake engine) and the engine cases of the first command: every floor solve asserts assumeUniqueness false; FU enables it only after the fresh DFS proof of that candidate |
| T02 | met | S2 is the Rederived signal (never a solved report or a rating); the audit compares ordinals (0 correctness problems) |
| T03 | met | reference hashes and the immutable snapshot hashes are recorded per phaseB try and checked; a fresh bounded count precedes every reference candidate |
| T04 | met | every dimension is charged; a stop is outcome sample-budget with the dimension; the hooks and the solution are restored (unit and engine cases) |
| T05 | met | budgets-r2.json: the fixed rule; cells fitted: mega16, samurai, classic9, mega12; unfitted (pilot ceilings kept): none |
| correctness | met | 0 false exact flags, 0 error records, 0 audit correctness problems |

## Notes

- S1 is a hit-rate item, not a speed item: these pilot hit counts (one sample per mode, two grids per cell) are small-n descriptions and carry no uncertainty guarantee; the gating numbers come from the frozen catalogue later
- F0/F1 is the isolated S2 comparison, FC/FM/F1 the floor choices, FU/F1 the uniqueness filter, FS/F1 the reference-parent choice; the gains are correlated and are not multiplied as independent factors
- phase A is not empty: it accepts many removals (the accepted counts are in the records and the per-pass table); what often comes out empty is the frontier LIST (every refused group proved ambiguous by the DFS), an anticipated failure mode of the route, and the DFS after every genuinely stuck floor test is the intended behaviour
- the final phase A parent is omitted as a DECLARED PROTOTYPE RESTRICTION, not a theorem: S2 operational solvability is heuristic and canonical requiredness is the authority
- K_F = 12 bounds the ATTEMPTED phase-B entries (phaseB tries); the allowed-set solves are only those attempts that passed the fresh uniqueness proof (and the FU filter); K_F = 12 and the 16 deepen proposals are acceptable prototype limits
- unreached keys are unstarted/inconclusive: they are not zero-cost trials and not censored observations
