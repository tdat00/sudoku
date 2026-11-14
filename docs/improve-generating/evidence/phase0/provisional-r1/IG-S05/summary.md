# IG-S05 summary (provisional-r1)

**provisional (pre-freeze): eight grid clusters per cell, at most two native-fork samples per grid; descriptive rates and intervals only; no S1 allowlisting, no bank decision, no formal gate (not-evaluable-pre-freeze)**

Formal gate: **not-evaluable-pre-freeze**. Evidence status: **provisional (pre-freeze)**.

Verdict: **inconclusive (all verified-hit rates are zero in every cell): stop for review before IG-S06**.

## Coverage

| planned trials | started | complete | censored (45 s guard) | budget-ended | errors | unstarted |
|---|---|---|---|---|---|---|
| 256 | 256 | 243 | 0 | 13 | 0 | 0 |

Unstarted keys are inconclusive: they are not zero-cost trials and not censored observations. Shards: screen recorded (attempts a1, a2, a3, a4, a5, a6, a7, a8, a9, a10).

### Per cell and mode: trials, outcomes and the state of the sample ordinals

| cell | mode | planned | started | complete | censored | budget-ended | errors | unstarted | ordinals returned | skipped (first exact) | ordinals censored/not reached |
|---|---|---|---|---|---|---|---|---|---|---|---|
| classic9 | proposal-only | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| classic9 | ordinary-only | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| classic9 | F0 | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| classic9 | F1 | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| classic9 | FC | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| classic9 | FM | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| classic9 | FU | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| classic9 | FS | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| mega12 | proposal-only | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| mega12 | ordinary-only | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| mega12 | F0 | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| mega12 | F1 | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| mega12 | FC | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| mega12 | FM | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| mega12 | FU | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| mega12 | FS | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| mega16 | proposal-only | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| mega16 | ordinary-only | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| mega16 | F0 | 8 | 8 | 6 | 0 | 2 | 0 | 0 | 16 | 0 | 0 |
| mega16 | F1 | 8 | 8 | 6 | 0 | 2 | 0 | 0 | 16 | 0 | 0 |
| mega16 | FC | 8 | 8 | 6 | 0 | 2 | 0 | 0 | 16 | 0 | 0 |
| mega16 | FM | 8 | 8 | 6 | 0 | 2 | 0 | 0 | 16 | 0 | 0 |
| mega16 | FU | 8 | 8 | 6 | 0 | 2 | 0 | 0 | 16 | 0 | 0 |
| mega16 | FS | 8 | 8 | 6 | 0 | 2 | 0 | 0 | 16 | 0 | 0 |
| samurai | proposal-only | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| samurai | ordinary-only | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| samurai | F0 | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| samurai | F1 | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| samurai | FC | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| samurai | FM | 8 | 8 | 7 | 0 | 1 | 0 | 0 | 16 | 0 | 0 |
| samurai | FU | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |
| samurai | FS | 8 | 8 | 8 | 0 | 0 | 0 | 0 | 16 | 0 | 0 |

## Primary rates: verified delivered grid hits per ready-interval CPU and wall second

The denominator is all generation work of the started trials of the mode from engine-ready to the end of cleanup, the actual grid build included (censored, budget-ended and errored trials stay in). Cold-inclusive rates add the worker start. The conditional rate excludes trials that ended on the sample budget: it is secondary and can select no winner and pass no gate. The setup-amortised column is a derived sensitivity (sample cost plus grid build divided by the native sample count): not measured request throughput, never the primary denominator.

| cell | mode | trials | verified hits | ready CPU s | ready wall s | hits / CPU s | hits / wall s | cold hits / CPU s | cold hits / wall s | cond. hits / CPU s | cond. trials | amortised hits / CPU s | amortised hits / wall s |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| classic9 | proposal-only | 8 | 0 | 0.658 | 0.296 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| classic9 | ordinary-only | 8 | 0 | 2.062 | 1.006 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| classic9 | F0 | 8 | 0 | 0.562 | 0.266 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| classic9 | F1 | 8 | 0 | 0.622 | 0.292 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| classic9 | FC | 8 | 0 | 0.499 | 0.261 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| classic9 | FM | 8 | 0 | 0.875 | 0.317 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| classic9 | FU | 8 | 0 | 0.671 | 0.275 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| classic9 | FS | 8 | 0 | 0.624 | 0.264 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| mega12 | proposal-only | 8 | 0 | 2.658 | 1.146 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| mega12 | ordinary-only | 8 | 0 | 12.363 | 10.063 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| mega12 | F0 | 8 | 0 | 1.972 | 0.900 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| mega12 | F1 | 8 | 0 | 2.248 | 0.888 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| mega12 | FC | 8 | 0 | 7.342 | 5.817 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| mega12 | FM | 8 | 0 | 2.173 | 0.948 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| mega12 | FU | 8 | 0 | 2.003 | 0.945 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| mega12 | FS | 8 | 0 | 2.297 | 0.931 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| mega16 | proposal-only | 8 | 0 | 11.231 | 8.497 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| mega16 | ordinary-only | 8 | 0 | 126 | 124 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| mega16 | F0 | 8 | 0 | 8.611 | 6.341 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 |
| mega16 | F1 | 8 | 0 | 8.735 | 6.346 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 |
| mega16 | FC | 8 | 0 | 12.280 | 9.874 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 |
| mega16 | FM | 8 | 0 | 9.498 | 6.831 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 |
| mega16 | FU | 8 | 0 | 9.122 | 6.514 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 |
| mega16 | FS | 8 | 0 | 9.765 | 7.039 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 |
| samurai | proposal-only | 8 | 0 | 7.532 | 4.912 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| samurai | ordinary-only | 8 | 0 | 23.812 | 20.477 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| samurai | F0 | 8 | 0 | 3.781 | 1.912 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| samurai | F1 | 8 | 0 | 3.953 | 1.804 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| samurai | FC | 8 | 0 | 5.640 | 3.247 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| samurai | FM | 8 | 0 | 5.139 | 2.933 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 0 |
| samurai | FU | 8 | 0 | 3.903 | 1.862 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |
| samurai | FS | 8 | 0 | 3.580 | 1.846 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 |

## Setup, sample and cleanup apart (sums over the started trials of a mode, ms)

| cell | mode | startup CPU | startup wall | grid build CPU | grid build wall | samples CPU | samples wall | cleanup CPU | cleanup wall |
|---|---|---|---|---|---|---|---|---|---|
| classic9 | proposal-only | 655 | 738 | 64 | 73.969 | 578 | 195 | 0 | 16.212 |
| classic9 | ordinary-only | 780 | 727 | 127 | 73.585 | 1857 | 905 | 32 | 18.399 |
| classic9 | F0 | 735 | 736 | 80 | 72.894 | 435 | 162 | 16 | 22.790 |
| classic9 | F1 | 717 | 744 | 78 | 78.757 | 464 | 180 | 48 | 23.375 |
| classic9 | FC | 689 | 716 | 62 | 72.656 | 391 | 160 | 46 | 20.131 |
| classic9 | FM | 690 | 714 | 79 | 69.843 | 734 | 219 | 47 | 20.474 |
| classic9 | FU | 689 | 731 | 47 | 74.831 | 436 | 168 | 125 | 23.105 |
| classic9 | FS | 703 | 741 | 76 | 73.936 | 345 | 162 | 63 | 19.175 |
| mega12 | proposal-only | 700 | 720 | 79 | 84.127 | 2471 | 1016 | 62 | 34.799 |
| mega12 | ordinary-only | 686 | 726 | 79 | 85.937 | 12174 | 9921 | 47 | 43.507 |
| mega12 | F0 | 747 | 737 | 95 | 87.180 | 1846 | 783 | 15 | 19.678 |
| mega12 | F1 | 672 | 731 | 109 | 86.225 | 2062 | 774 | 31 | 18.193 |
| mega12 | FC | 720 | 741 | 154 | 88.286 | 7109 | 5699 | 16 | 19.555 |
| mega12 | FM | 782 | 730 | 142 | 85.416 | 1969 | 833 | 31 | 19.622 |
| mega12 | FU | 669 | 731 | 64 | 88.185 | 1812 | 827 | 48 | 19.047 |
| mega12 | FS | 812 | 736 | 157 | 88.255 | 2125 | 815 | 15 | 17.880 |
| mega16 | proposal-only | 706 | 734 | 186 | 110 | 10781 | 8330 | 264 | 45.047 |
| mega16 | ordinary-only | 705 | 747 | 169 | 114 | 125564 | 123412 | 15 | 45.931 |
| mega16 | F0 | 778 | 743 | 78 | 117 | 8393 | 6169 | 124 | 43.604 |
| mega16 | F1 | 781 | 744 | 189 | 110 | 8452 | 6182 | 63 | 42.218 |
| mega16 | FC | 733 | 732 | 125 | 110 | 12014 | 9710 | 125 | 42.410 |
| mega16 | FM | 688 | 736 | 156 | 111 | 9187 | 6665 | 124 | 43.526 |
| mega16 | FU | 709 | 750 | 201 | 115 | 8843 | 6343 | 15 | 43.656 |
| mega16 | FS | 735 | 742 | 200 | 113 | 9392 | 6869 | 173 | 44.666 |
| samurai | proposal-only | 720 | 721 | 172 | 114 | 7190 | 4742 | 108 | 41.497 |
| samurai | ordinary-only | 720 | 727 | 204 | 114 | 23483 | 20307 | 109 | 41.618 |
| samurai | F0 | 783 | 746 | 219 | 126 | 3390 | 1731 | 94 | 42.497 |
| samurai | F1 | 717 | 730 | 172 | 116 | 3594 | 1635 | 172 | 41.651 |
| samurai | FC | 784 | 733 | 188 | 124 | 5326 | 3066 | 110 | 44.446 |
| samurai | FM | 768 | 745 | 249 | 122 | 4686 | 2757 | 156 | 41.593 |
| samurai | FU | 737 | 755 | 171 | 123 | 3546 | 1684 | 140 | 41.961 |
| samurai | FS | 810 | 742 | 235 | 120 | 3298 | 1670 | 47 | 43.447 |

CPU is the process total read at the host (worker threads included); its quantum is 16 ms, so a short interval is resolved only in the sum. The sample columns are the host stamps of the worker's messages: attribution only.

## Paired rate differences against the native kinds (whole grid clusters resampled together)

Difference = rate of the variant minus rate of the control, per second; one-sided 95% lower bound (5th percentile), ordinary 95% interval; zero hits give a zero lower bound and no pseudo-count. Descriptive provisional intervals from eight clusters with poor small-sample coverage: not reliable confidence guarantees and not a gate. "proposal-only" is both the current proposal kind and the proposal-only control.

| cell | mode | control | per | coverage | paired clusters | rate (mode) | rate (control) | difference | 95% CI low | 95% CI high | lower bound (1-sided) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| classic9 | F0 | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | F0 | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | F1 | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | F1 | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FC | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FC | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FM | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FM | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FU | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FU | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FS | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FS | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | ordinary-only | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | ordinary-only | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | F0 | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | F0 | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | F1 | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | F1 | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FC | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FC | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FM | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FM | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FU | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FU | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FS | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic9 | FS | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | F0 | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | F0 | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | F1 | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | F1 | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FC | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FC | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FM | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FM | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FU | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FU | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FS | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FS | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | ordinary-only | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | ordinary-only | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | F0 | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | F0 | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | F1 | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | F1 | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FC | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FC | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FM | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FM | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FU | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FU | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FS | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega12 | FS | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | F0 | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | F0 | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | F1 | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | F1 | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FC | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FC | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FM | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FM | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FU | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FU | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FS | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FS | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | ordinary-only | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | ordinary-only | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | F0 | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | F0 | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | F1 | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | F1 | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FC | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FC | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FM | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FM | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FU | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FU | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FS | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| mega16 | FS | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | F0 | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | F0 | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | F1 | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | F1 | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FC | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FC | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FM | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FM | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FU | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FU | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FS | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FS | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | ordinary-only | proposal-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | ordinary-only | proposal-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | F0 | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | F0 | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | F1 | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | F1 | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FC | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FC | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FM | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FM | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FU | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FU | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FS | ordinary-only | cpu | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |
| samurai | FS | ordinary-only | wall | complete-coverage | 8/8 | 0 | 0 | 0 | 0 | 0 | 0 |

## The funnel of the frontier variants: frontier, uniqueness, canonical, deepen (all samples)

Floor tests are accepted (a complete floor proof or the S2 re-derivation) or refused: stuck with a unique, an unknown or an ambiguous DFS verdict. "Entries" are the frontier groups left after phase A; phase-B tries are the attempted entries (at most K_F = 12), whose fresh DFS proof is unique, ambiguous at the reference or unknown; allowed-set solves, canonical ratings and their exact/shallow/below/above outcomes follow, then the deepen proposals. Budget stops are the samples that ended on the count budget.

| cell | mode | samples | floor tests | accepted full/S2 | refused stuck-unique/unknown/ambiguous | entries at end | phase-B tries | proof unique/ambiguous/unknown | allowed solves | canonical ratings | exact/shallow/below/above | deepen runs | deepen proposals | deepen commits | deepen in band | deepen exact/shallow/below/above | budget stops | by dimension |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| classic9 | F0 | 16 | 656 | 427/0 | 0/0/229 | 0 | 0 | 0/0/0 | 0 | 0 | 0/0/0/0 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| classic9 | F1 | 16 | 656 | 65/362 | 0/0/229 | 0 | 0 | 0/0/0 | 0 | 0 | 0/0/0/0 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| classic9 | FC | 16 | 656 | 65/362 | 0/0/229 | 0 | 0 | 0/0/0 | 0 | 0 | 0/0/0/0 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| classic9 | FM | 16 | 656 | 65/362 | 0/0/229 | 0 | 0 | 0/0/0 | 0 | 0 | 0/0/0/0 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| classic9 | FU | 16 | 656 | 65/362 | 0/0/229 | 0 | 0 | 0/0/0 | 0 | 0 | 0/0/0/0 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| classic9 | FS | 16 | 656 | 65/362 | 0/0/229 | 0 | 0 | 0/0/0 | 0 | 0 | 0/0/0/0 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| mega12 | F0 | 16 | 1196 | 736/0 | 51/0/409 | 7 | 7 | 7/0/0 | 7 | 7 | 0/0/0/7 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| mega12 | F1 | 16 | 1196 | 74/662 | 51/0/409 | 7 | 7 | 7/0/0 | 7 | 7 | 0/0/0/7 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| mega12 | FC | 16 | 1152 | 74/657 | 30/0/391 | 30 | 30 | 16/14/0 | 16 | 16 | 0/5/1/10 | 1 | 16 | 0 | 0 | 0/0/0/0 | 0 | none |
| mega12 | FM | 16 | 1152 | 74/658 | 23/0/397 | 23 | 23 | 13/10/0 | 13 | 13 | 0/7/0/6 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| mega12 | FU | 16 | 1196 | 74/662 | 51/0/409 | 7 | 7 | 7/0/0 | 7 | 7 | 0/0/0/7 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| mega12 | FS | 16 | 1196 | 74/662 | 51/0/409 | 7 | 7 | 7/0/0 | 7 | 7 | 0/0/0/7 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| mega16 | F0 | 16 | 2222 | 1241/0 | 217/0/762 | 41 | 29 | 24/5/0 | 24 | 24 | 0/0/0/24 | 0 | 0 | 0 | 0 | 0/0/0/0 | 2 | dfsEntries 2 |
| mega16 | F1 | 16 | 2222 | 71/1170 | 217/0/762 | 41 | 29 | 24/5/0 | 24 | 24 | 0/0/0/24 | 0 | 0 | 0 | 0 | 0/0/0/0 | 2 | dfsEntries 2 |
| mega16 | FC | 16 | 2045 | 71/1160 | 129/0/684 | 129 | 113 | 55/58/0 | 55 | 55 | 0/12/1/42 | 1 | 9 | 0 | 0 | 0/0/0/0 | 2 | solverChecks 1, dfsEntries 1 |
| mega16 | FM | 16 | 2035 | 71/1162 | 125/0/675 | 125 | 106 | 48/58/0 | 48 | 48 | 0/10/0/38 | 0 | 0 | 0 | 0 | 0/0/0/0 | 2 | dfsEntries 2 |
| mega16 | FU | 16 | 2222 | 71/1170 | 217/0/762 | 41 | 29 | 24/5/0 | 24 | 24 | 0/0/0/24 | 0 | 0 | 0 | 0 | 0/0/0/0 | 2 | dfsEntries 2 |
| mega16 | FS | 16 | 2222 | 71/1170 | 217/0/762 | 41 | 29 | 29/0/0 | 29 | 29 | 0/0/0/29 | 0 | 0 | 0 | 0 | 0/0/0/0 | 2 | dfsEntries 2 |
| samurai | F0 | 16 | 2996 | 2128/0 | 37/0/831 | 1 | 1 | 1/0/0 | 1 | 1 | 0/0/0/1 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| samurai | F1 | 16 | 2996 | 87/2041 | 37/0/831 | 1 | 1 | 1/0/0 | 1 | 1 | 0/0/0/1 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| samurai | FC | 16 | 2960 | 87/2031 | 26/0/816 | 26 | 26 | 11/15/0 | 11 | 11 | 0/7/1/3 | 1 | 16 | 0 | 0 | 0/0/0/0 | 0 | none |
| samurai | FM | 16 | 2949 | 87/2024 | 21/0/816 | 21 | 21 | 15/6/0 | 15 | 15 | 0/9/0/6 | 0 | 0 | 0 | 0 | 0/0/0/0 | 1 | dfsEntries 1 |
| samurai | FU | 16 | 2996 | 87/2041 | 37/0/831 | 1 | 1 | 1/0/0 | 1 | 1 | 0/0/0/1 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |
| samurai | FS | 16 | 2996 | 87/2041 | 37/0/831 | 1 | 1 | 1/0/0 | 1 | 1 | 0/0/0/1 | 0 | 0 | 0 | 0 | 0/0/0/0 | 0 | none |

## How much of a frontier sample is floor and DFS work (shares of the sample work after the grid)

Wall shares are the phase wall times (phase A holds every floor test and the DFS after each stuck one; phase B excludes the nested deepen). Check shares are by the engine purposes: floor tests, the DFS (refused-test uniqueness and the phase-B proofs), the allowed-set and canonical solves (the plan's "few solves"), the deepen objective and the FU filter.

| cell | mode | wall: phase A | wall: phase B | wall: deepen | wall: init | checks: floor tests | checks: allowed + canonical | checks: deepen | checks: FU filter | DFS entries | DFS checks | logical checks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| classic9 | F0 | 93% | 0% | 0% | 7% | 100% | 0% | 0% | 0% | 1300 | 842 | 78393 |
| classic9 | F1 | 92% | 0% | 0% | 8% | 100% | 0% | 0% | 0% | 1300 | 842 | 75112 |
| classic9 | FC | 93% | 0% | 0% | 7% | 100% | 0% | 0% | 0% | 1300 | 842 | 75112 |
| classic9 | FM | 95% | 0% | 0% | 5% | 100% | 0% | 0% | 0% | 1300 | 842 | 98895 |
| classic9 | FU | 93% | 0% | 0% | 7% | 100% | 0% | 0% | 0% | 1300 | 842 | 75112 |
| classic9 | FS | 92% | 0% | 0% | 8% | 100% | 0% | 0% | 0% | 1300 | 842 | 75112 |
| mega12 | F0 | 59% | 40% | 0% | 2% | 59% | 41% | 0% | 0% | 5445 | 4569 | 514007 |
| mega12 | F1 | 58% | 40% | 0% | 2% | 58% | 42% | 0% | 0% | 5445 | 4569 | 503246 |
| mega12 | FC | 5% | 10% | 85% | 0% | 11% | 19% | 70% | 0% | 5124 | 4268 | 1783871 |
| mega12 | FM | 49% | 50% | 0% | 1% | 49% | 51% | 0% | 0% | 5451 | 4601 | 544387 |
| mega12 | FU | 55% | 44% | 0% | 2% | 54% | 40% | 0% | 6% | 5445 | 4569 | 537828 |
| mega12 | FS | 59% | 39% | 0% | 2% | 58% | 42% | 0% | 0% | 5445 | 4569 | 503246 |
| mega16 | F0 | 52% | 48% | 0% | 0% | 42% | 58% | 0% | 0% | 176909 | 175130 | 3018290 |
| mega16 | F1 | 52% | 48% | 0% | 0% | 41% | 59% | 0% | 0% | 176909 | 175130 | 2973346 |
| mega16 | FC | 19% | 50% | 31% | 0% | 16% | 65% | 20% | 0% | 145622 | 143952 | 4349811 |
| mega16 | FM | 35% | 65% | 0% | 0% | 25% | 75% | 0% | 0% | 148146 | 146504 | 3439108 |
| mega16 | FU | 51% | 49% | 0% | 0% | 39% | 57% | 0% | 4% | 176909 | 175130 | 3097614 |
| mega16 | FS | 47% | 53% | 0% | 0% | 36% | 64% | 0% | 0% | 176711 | 174937 | 3374776 |
| samurai | F0 | 88% | 11% | 0% | 1% | 94% | 6% | 0% | 0% | 9662 | 7962 | 2716021 |
| samurai | F1 | 88% | 11% | 0% | 1% | 93% | 7% | 0% | 0% | 9662 | 7962 | 2492815 |
| samurai | FC | 33% | 23% | 43% | 0% | 63% | 18% | 20% | 0% | 9476 | 7777 | 3134525 |
| samurai | FM | 61% | 38% | 0% | 1% | 74% | 26% | 0% | 0% | 12430 | 10749 | 3424590 |
| samurai | FU | 87% | 12% | 0% | 1% | 93% | 6% | 0% | 0% | 9662 | 7962 | 2502301 |
| samurai | FS | 88% | 11% | 0% | 1% | 93% | 7% | 0% | 0% | 9662 | 7962 | 2492815 |

## The native samples (both samples of one kind on one grid, native caps and keeper)

| cell | mode | samples | exact | shallow | below | above | unrated | groups tried | accepted | rejected | skipped | oracle calls | canonical ratings | proposals |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| classic9 | proposal-only | 16 | 0 | 2 | 14 | 0 | 0 | 1097 | 427 | 229 | 290 | 2070 | 16 | 0 |
| classic9 | ordinary-only | 16 | 0 | 2 | 14 | 0 | 0 | 1097 | 427 | 229 | 290 | 1097 | 16 | 0 |
| mega12 | proposal-only | 16 | 0 | 16 | 0 | 0 | 0 | 2051 | 725 | 427 | 517 | 3867 | 43 | 0 |
| mega12 | ordinary-only | 16 | 0 | 14 | 2 | 0 | 0 | 2002 | 714 | 438 | 517 | 2002 | 16 | 0 |
| mega16 | proposal-only | 16 | 0 | 16 | 0 | 0 | 0 | 2472 | 1221 | 827 | 890 | 4401 | 92 | 0 |
| mega16 | ordinary-only | 16 | 0 | 16 | 0 | 0 | 0 | 2416 | 1212 | 836 | 890 | 2416 | 16 | 0 |
| samurai | proposal-only | 16 | 0 | 13 | 3 | 0 | 0 | 5262 | 2121 | 839 | 1318 | 10024 | 64 | 0 |
| samurai | ordinary-only | 16 | 0 | 10 | 5 | 1 | 0 | 5204 | 2105 | 855 | 1318 | 5204 | 16 | 0 |

## Raw sample detail

The raw exact sample rate is claimed-exact samples over samples observed (a claimed exact sample is always the returned one, because the first exact sample ends the trial); distinct hashes are those of the verified hits; the first-hit ordinal and the skipped ordinals show the early stops.

| cell | mode | samples observed | claimed exact | raw exact sample rate | distinct hit hashes | first-hit ordinal | skipped ordinals | mean sample wall ms | mean sample CPU ms | censored samples |
|---|---|---|---|---|---|---|---|---|---|---|
| classic9 | proposal-only | 16 | 0 | 0 | 0 | {} | {} | 12.180 | 36.130 | 0 |
| classic9 | ordinary-only | 16 | 0 | 0 | 0 | {} | {} | 56.540 | 116 | 0 |
| classic9 | F0 | 16 | 0 | 0 | 0 | {} | {} | 10.120 | 27.190 | 0 |
| classic9 | F1 | 16 | 0 | 0 | 0 | {} | {} | 11.280 | 29 | 0 |
| classic9 | FC | 16 | 0 | 0 | 0 | {} | {} | 10 | 24.440 | 0 |
| classic9 | FM | 16 | 0 | 0 | 0 | {} | {} | 13.690 | 45.880 | 0 |
| classic9 | FU | 16 | 0 | 0 | 0 | {} | {} | 10.480 | 27.250 | 0 |
| classic9 | FS | 16 | 0 | 0 | 0 | {} | {} | 10.120 | 21.560 | 0 |
| mega12 | proposal-only | 16 | 0 | 0 | 0 | {} | {} | 63.480 | 154 | 0 |
| mega12 | ordinary-only | 16 | 0 | 0 | 0 | {} | {} | 620 | 761 | 0 |
| mega12 | F0 | 16 | 0 | 0 | 0 | {} | {} | 48.950 | 115 | 0 |
| mega12 | F1 | 16 | 0 | 0 | 0 | {} | {} | 48.380 | 129 | 0 |
| mega12 | FC | 16 | 0 | 0 | 0 | {} | {} | 356 | 444 | 0 |
| mega12 | FM | 16 | 0 | 0 | 0 | {} | {} | 52.070 | 123 | 0 |
| mega12 | FU | 16 | 0 | 0 | 0 | {} | {} | 51.710 | 113 | 0 |
| mega12 | FS | 16 | 0 | 0 | 0 | {} | {} | 50.930 | 133 | 0 |
| mega16 | proposal-only | 16 | 0 | 0 | 0 | {} | {} | 521 | 674 | 0 |
| mega16 | ordinary-only | 16 | 0 | 0 | 0 | {} | {} | 7713 | 7848 | 0 |
| mega16 | F0 | 16 | 0 | 0 | 0 | {} | {} | 386 | 525 | 0 |
| mega16 | F1 | 16 | 0 | 0 | 0 | {} | {} | 386 | 528 | 0 |
| mega16 | FC | 16 | 0 | 0 | 0 | {} | {} | 607 | 751 | 0 |
| mega16 | FM | 16 | 0 | 0 | 0 | {} | {} | 417 | 574 | 0 |
| mega16 | FU | 16 | 0 | 0 | 0 | {} | {} | 396 | 553 | 0 |
| mega16 | FS | 16 | 0 | 0 | 0 | {} | {} | 429 | 587 | 0 |
| samurai | proposal-only | 16 | 0 | 0 | 0 | {} | {} | 296 | 449 | 0 |
| samurai | ordinary-only | 16 | 0 | 0 | 0 | {} | {} | 1269 | 1468 | 0 |
| samurai | F0 | 16 | 0 | 0 | 0 | {} | {} | 108 | 212 | 0 |
| samurai | F1 | 16 | 0 | 0 | 0 | {} | {} | 102 | 225 | 0 |
| samurai | FC | 16 | 0 | 0 | 0 | {} | {} | 192 | 333 | 0 |
| samurai | FM | 16 | 0 | 0 | 0 | {} | {} | 172 | 293 | 0 |
| samurai | FU | 16 | 0 | 0 | 0 | {} | {} | 105 | 222 | 0 |
| samurai | FS | 16 | 0 | 0 | 0 | {} | {} | 104 | 206 | 0 |

## Post-timing canonical classification of the final phase A parent

The omitted parent (a declared prototype restriction of IG-S04) is rated afterwards by the untouched canonical rating on an unpatched instance, with its own solution count. It never steered generation and never enters a hit count.

| cell | mode | samples with a parent | exact | shallow | below | above | incomplete | ambiguous | unknown | unclassified | distinct parents | distinct exact |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| classic9 | F0 | 16 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 16 | 0 |
| classic9 | F1 | 16 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 16 | 0 |
| classic9 | FC | 16 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 16 | 0 |
| classic9 | FM | 16 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 16 | 0 |
| classic9 | FU | 16 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 16 | 0 |
| classic9 | FS | 16 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 16 | 0 |
| mega12 | F0 | 16 | 0 | 3 | 12 | 1 | 0 | 0 | 0 | 0 | 16 | 0 |
| mega12 | F1 | 16 | 0 | 3 | 12 | 1 | 0 | 0 | 0 | 0 | 16 | 0 |
| mega12 | FC | 16 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 16 | 0 |
| mega12 | FM | 16 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 16 | 0 |
| mega12 | FU | 16 | 0 | 3 | 12 | 1 | 0 | 0 | 0 | 0 | 16 | 0 |
| mega12 | FS | 16 | 0 | 3 | 12 | 1 | 0 | 0 | 0 | 0 | 16 | 0 |
| mega16 | F0 | 14 | 0 | 6 | 5 | 3 | 0 | 0 | 0 | 0 | 14 | 0 |
| mega16 | F1 | 14 | 0 | 6 | 5 | 3 | 0 | 0 | 0 | 0 | 14 | 0 |
| mega16 | FC | 15 | 0 | 0 | 15 | 0 | 0 | 0 | 0 | 0 | 15 | 0 |
| mega16 | FM | 14 | 0 | 0 | 14 | 0 | 0 | 0 | 0 | 0 | 14 | 0 |
| mega16 | FU | 14 | 0 | 6 | 5 | 3 | 0 | 0 | 0 | 0 | 14 | 0 |
| mega16 | FS | 14 | 0 | 6 | 5 | 3 | 0 | 0 | 0 | 0 | 14 | 0 |
| samurai | F0 | 16 | 0 | 6 | 8 | 2 | 0 | 0 | 0 | 0 | 16 | 0 |
| samurai | F1 | 16 | 0 | 6 | 8 | 2 | 0 | 0 | 0 | 0 | 16 | 0 |
| samurai | FC | 16 | 0 | 2 | 14 | 0 | 0 | 0 | 0 | 0 | 16 | 0 |
| samurai | FM | 15 | 0 | 4 | 11 | 0 | 0 | 0 | 0 | 0 | 15 | 0 |
| samurai | FU | 16 | 0 | 6 | 8 | 2 | 0 | 0 | 0 | 0 | 16 | 0 |
| samurai | FS | 16 | 0 | 6 | 8 | 2 | 0 | 0 | 0 | 0 | 16 | 0 |

## Diagnostic selection per cell (a label for IG-S06, not an adopted algorithm and not a gate)

| cell | selected | winner | reason | controls complete | screen finding | formal gate | zero-baseline feasibility | stability (share of resamples) |
|---|---|---|---|---|---|---|---|---|
| classic9 | F1 | no | all-zero-verified-hits | yes | inconclusive (every rate is zero in this cell: no verified hit in any mode) | not-evaluable-pre-freeze | projection-awaits-author-review | default 100% |
| mega12 | F1 | no | all-zero-verified-hits | yes | inconclusive (every rate is zero in this cell: no verified hit in any mode) | not-evaluable-pre-freeze | projection-awaits-author-review | default 100% |
| mega16 | F1 | no | all-zero-verified-hits | yes | inconclusive (every rate is zero in this cell: no verified hit in any mode) | not-evaluable-pre-freeze | projection-awaits-author-review | default 100% |
| samurai | F1 | no | all-zero-verified-hits | yes | inconclusive (every rate is zero in this cell: no verified hit in any mode) | not-evaluable-pre-freeze | projection-awaits-author-review | default 100% |

Rule: hits per ready CPU second, then per ready wall second, then F1, FC, FM, FU, FS, F0, among variants with every planned grid trial observed, both controls observed everywhere and at least one verified hit; otherwise F1 is an explicitly non-winning default. The fastest zero-hit mode is never a winner.

## Anomalies and identity

No anomaly: no false exact flag, no duplicated hit, no grid-hash disagreement inside a cluster, no parent-hash mismatch.

Identity problems: none. Manifest hashes: e0815e48be61; runtime 36b2b8327f34; harness 58c583c213f1; budget f0a0c4220327; screen manifest dcc22501e454.

## Machine time

Allocation 2880 s, charged 781 s over 10 commands (occupied wrapper time + 45 s grace each), remaining 2099 s; priority waits 4610 s, not charged.

## Notes

- the intervals come from eight whole grid clusters per cell and are descriptive provisional ones with poor small-sample coverage, not lower-confidence guarantees
- a per-sample rate is not extrapolated to an unqualified 90% request claim; two-grid budget fits are experimental limits, not tail guarantees
- the zero-baseline feasibility threshold (the lower-bound rate projecting to half of the requests inside the budget at width 4) is projection-awaits-author-review, never evaluated here
- F0/F1 is the isolated S2 comparison, FC/FM/F1 the floor choices, FU/F1 the uniqueness filter, FS/F1 the reference-parent choice; the gains are correlated and are not multiplied
- the final phase A parent classification is a post-timing diagnostic: it never steers generation and never enters a hit count
- unreached keys are unstarted/inconclusive: they are not zero-cost trials and not censored observations

## Acceptance

| id | status | evidence |
|---|---|---|
| B01 | met | rates.json and paired-intervals.json: verified hits per ready CPU and wall second of every mode, the two native kinds included, with the paired difference of each frontier variant against each |
| B02 | met | zero-hit rates are shown with their trial counts, the budget-ended share and the unstarted keys; a hit counts once per grid trial; censored and budget-ended trials stay in the denominators (256 of 256 keys started) |
| B03 | pending | selection.json is a labelled diagnostic written before the held-out cohort; the orchestrator reviews the raw paired coverage |
| T01 | met | every started trial lists the state of ordinals 1 and 2 (returned, sample-budget, skipped-first-exact, censored, not-reached); unstarted keys are listed as unstarted (0) |
| T02 | met | one grid per mode built afresh; the grid hashes of the modes of a cluster are equal (0 clusters differ); the forks are model, grid#1, dig#1.1, dig#1.2 |
| T03 | met | the frozen IG-S04 budget vector of each cell is used by every frontier arm of that cell (hash classic9 equal, mega12 equal, mega16 equal, samurai equal) |
| T04 | met | whole grid clusters are resampled together (2,000 draws, seed 20261114); zero hits give a zero lower bound; no pseudo-count |
| T05 | met | 0 false exact flags, 0 error records; every numerator is a claimed AND independently verified exact return; the denominator is all engine-ready-to-cleanup CPU/wall of the started trials |
