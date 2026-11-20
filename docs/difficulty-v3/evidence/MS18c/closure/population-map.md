# MS18c step 5: population map

Status: policy/implementation resolved; live validation of killer, jigsaw, greater-than, extra-regions and wordoku pending MS18e. States: A `6a473f7a` (pre-publication), B `387a4c8d` / HEAD, and the
working tree of step 5. Registration inventories are saved under `closure/population/` and the emulation of
BEFORE and AFTER equals the official `--list-tests` inventories test for test.

## Registrations by suite

| suite | A | before (B) | after |
|---|---|---|---|
| killer | 100 | 94 | 94 |
| jigsaw | 100 | 100 | 88 |
| greater-than | 132 | 132 | 108 |
| extra-regions | 147 | 147 | 129 |
| wordoku | 140 | 140 | 128 |
| variants | 324 | 285 | 285 |
| perf | 51 | 51 | 51 |
| manual-corpus | n/a | 46 | 53 |

## Removed public per-level registrations (111)

| removed at | suite | variant | level | original index | count | seed recipe | trace | options | test | GQ verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| checkpoint B (live support) | killer | killer | hard | 3 | 20 | i + 1 = 1..20 | off | - | I5: every puzzle has a complete proof; one rated as requested has its score in the band | hidden 0/14 (stopped: misses) |
| checkpoint B (live support) | killer | killer | expert | 4 | 8 | i + 1 = 1..8 | off | - | I5: every puzzle has a complete proof; one rated as requested has its score in the band | hidden 2/12 (stopped: time) |
| checkpoint B (live support) | killer | killer | master | 5 | 8 | i + 1 = 1..8 | off | - | I5: every puzzle has a complete proof; one rated as requested has its score in the band | hidden 11/14 (stopped: time) |
| checkpoint B (live support) | killer | killer | nightmare | 6 | 8 | i + 1 = 1..8 | off | - | I5: every puzzle has a complete proof; one rated as requested has its score in the band | hidden 18/22 (stopped: time) |
| checkpoint B (live support) | killer | killer | hell1 | 7 | 8 | i + 1 = 1..8 | off | - | I5: every puzzle has a complete proof; one rated as requested has its score in the band | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | killer | killer | hell2 | 8 | 8 | i + 1 = 1..8 | off | - | I5: every puzzle has a complete proof; one rated as requested has its score in the band | hidden 40/40 (stopped: time) |
| step 5 | jigsaw | jigsaw9 | expert | 4 | 20 | 700 + 100 * li + i = 1100..1119 | off | - | I1: exactly one solution; I2: givens are part of the solution; I3: the solution is valid | hidden 30/34 (stopped: time) |
| step 5 | jigsaw | jigsaw9 | expert | 4 | 20 | 700 + 100 * li + i = 1100..1119 | off | - | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: at least minClues givens | hidden 30/34 (stopped: time) |
| step 5 | jigsaw | jigsaw9 | expert | 4 | 20 | 700 + 100 * li + i = 1100..1119 | off | - | I7: every deduction of the technique ladder on the way to the solution is sound | hidden 30/34 (stopped: time) |
| step 5 | jigsaw | jigsaw9 | expert | 4 | 20 | 700 + 100 * li + i = 1100..1119 | off | - | CV6: p95 of the generation time is within the design.md 9.1 budget of 900 ms | hidden 30/34 (stopped: time) |
| step 5 | jigsaw | jigsaw9 | nightmare | 6 | 20 | 700 + 100 * li + i = 1300..1319 | off | - | I1: exactly one solution; I2: givens are part of the solution; I3: the solution is valid | hidden 27/27 (stopped: time) |
| step 5 | jigsaw | jigsaw9 | nightmare | 6 | 20 | 700 + 100 * li + i = 1300..1319 | off | - | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: at least minClues givens | hidden 27/27 (stopped: time) |
| step 5 | jigsaw | jigsaw9 | nightmare | 6 | 20 | 700 + 100 * li + i = 1300..1319 | off | - | I7: every deduction of the technique ladder on the way to the solution is sound | hidden 27/27 (stopped: time) |
| step 5 | jigsaw | jigsaw9 | nightmare | 6 | 20 | 700 + 100 * li + i = 1300..1319 | off | - | CV6: p95 of the generation time is within the design.md 9.1 budget of 5000 ms | hidden 27/27 (stopped: time) |
| step 5 | jigsaw | jigsaw9 | hell1 | 7 | 20 | 700 + 100 * li + i = 1400..1419 | off | - | I1: exactly one solution; I2: givens are part of the solution; I3: the solution is valid | hidden 0/9 (stopped: time) |
| step 5 | jigsaw | jigsaw9 | hell1 | 7 | 20 | 700 + 100 * li + i = 1400..1419 | off | - | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: at least minClues givens | hidden 0/9 (stopped: time) |
| step 5 | jigsaw | jigsaw9 | hell1 | 7 | 20 | 700 + 100 * li + i = 1400..1419 | off | - | I7: every deduction of the technique ladder on the way to the solution is sound | hidden 0/9 (stopped: time) |
| step 5 | jigsaw | jigsaw9 | hell1 | 7 | 20 | 700 + 100 * li + i = 1400..1419 | off | - | CV6: p95 of the generation time is within the design.md 9.1 budget of 5000 ms | hidden 0/9 (stopped: time) |
| step 5 | greater-than | greaterThan | normal | 2 | 20 | 100 * (li + 1) + i = 300..319 | summary | - | I1: exactly one solution; I2: givens are part of the solution; I3: it satisfies units and signs | hidden 40/40 |
| step 5 | greater-than | greaterThan | normal | 2 | 20 | 100 * (li + 1) + i = 300..319 | summary | - | every sign agrees with the solution, joins two neighbours of one box, and appears once | hidden 40/40 |
| step 5 | greater-than | greaterThan | normal | 2 | 20 | 100 * (li + 1) + i = 300..319 | summary | - | the sign set is minimal: removing any sign that is left gives a second solution | hidden 40/40 |
| step 5 | greater-than | greaterThan | normal | 2 | 20 | 100 * (li + 1) + i = 300..319 | summary | - | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: at least minClues givens, every unit its minimum | hidden 40/40 |
| step 5 | greater-than | greaterThan | normal | 2 | 20 | 100 * (li + 1) + i = 300..319 | summary | - | the clues follow the symmetry of the configuration (rotational180): the signs are not mirrored | hidden 40/40 |
| step 5 | greater-than | greaterThan | normal | 2 | 20 | 100 * (li + 1) + i = 300..319 | summary | - | CV6: p95 of the generation time is within the design.md 9.1 budget of 700 ms | hidden 40/40 |
| step 5 | greater-than | greaterThan | expert | 4 | 10 | 100 * (li + 1) + i = 500..509 | summary | - | I1: exactly one solution; I2: givens are part of the solution; I3: it satisfies units and signs | hidden 38/40 (stopped: time) |
| step 5 | greater-than | greaterThan | expert | 4 | 10 | 100 * (li + 1) + i = 500..509 | summary | - | every sign agrees with the solution, joins two neighbours of one box, and appears once | hidden 38/40 (stopped: time) |
| step 5 | greater-than | greaterThan | expert | 4 | 10 | 100 * (li + 1) + i = 500..509 | summary | - | the sign set is minimal: removing any sign that is left gives a second solution | hidden 38/40 (stopped: time) |
| step 5 | greater-than | greaterThan | expert | 4 | 10 | 100 * (li + 1) + i = 500..509 | summary | - | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: at least minClues givens, every unit its minimum | hidden 38/40 (stopped: time) |
| step 5 | greater-than | greaterThan | expert | 4 | 10 | 100 * (li + 1) + i = 500..509 | summary | - | the clues follow the symmetry of the configuration (rotational180): the signs are not mirrored | hidden 38/40 (stopped: time) |
| step 5 | greater-than | greaterThan | expert | 4 | 10 | 100 * (li + 1) + i = 500..509 | summary | - | CV6: p95 of the generation time is within the design.md 9.1 budget of 10000 ms | hidden 38/40 (stopped: time) |
| step 5 | greater-than | greaterThan | nightmare | 6 | 10 | 100 * (li + 1) + i = 700..709 | summary | - | I1: exactly one solution; I2: givens are part of the solution; I3: it satisfies units and signs | hidden 13/13 (stopped: time) |
| step 5 | greater-than | greaterThan | nightmare | 6 | 10 | 100 * (li + 1) + i = 700..709 | summary | - | every sign agrees with the solution, joins two neighbours of one box, and appears once | hidden 13/13 (stopped: time) |
| step 5 | greater-than | greaterThan | nightmare | 6 | 10 | 100 * (li + 1) + i = 700..709 | summary | - | the sign set is minimal: removing any sign that is left gives a second solution | hidden 13/13 (stopped: time) |
| step 5 | greater-than | greaterThan | nightmare | 6 | 10 | 100 * (li + 1) + i = 700..709 | summary | - | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: at least minClues givens, every unit its minimum | hidden 13/13 (stopped: time) |
| step 5 | greater-than | greaterThan | nightmare | 6 | 10 | 100 * (li + 1) + i = 700..709 | summary | - | the clues follow the symmetry of the configuration (rotational180): the signs are not mirrored | hidden 13/13 (stopped: time) |
| step 5 | greater-than | greaterThan | nightmare | 6 | 10 | 100 * (li + 1) + i = 700..709 | summary | - | CV6: p95 of the generation time is within the design.md 9.1 budget of 10000 ms | hidden 13/13 (stopped: time) |
| step 5 | greater-than | greaterThan | hell1 | 7 | 10 | 100 * (li + 1) + i = 800..809 | summary | - | I1: exactly one solution; I2: givens are part of the solution; I3: it satisfies units and signs | hidden 0/9 (stopped: time) |
| step 5 | greater-than | greaterThan | hell1 | 7 | 10 | 100 * (li + 1) + i = 800..809 | summary | - | every sign agrees with the solution, joins two neighbours of one box, and appears once | hidden 0/9 (stopped: time) |
| step 5 | greater-than | greaterThan | hell1 | 7 | 10 | 100 * (li + 1) + i = 800..809 | summary | - | the sign set is minimal: removing any sign that is left gives a second solution | hidden 0/9 (stopped: time) |
| step 5 | greater-than | greaterThan | hell1 | 7 | 10 | 100 * (li + 1) + i = 800..809 | summary | - | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: at least minClues givens, every unit its minimum | hidden 0/9 (stopped: time) |
| step 5 | greater-than | greaterThan | hell1 | 7 | 10 | 100 * (li + 1) + i = 800..809 | summary | - | the clues follow the symmetry of the configuration (rotational180): the signs are not mirrored | hidden 0/9 (stopped: time) |
| step 5 | greater-than | greaterThan | hell1 | 7 | 10 | 100 * (li + 1) + i = 800..809 | summary | - | CV6: p95 of the generation time is within the design.md 9.1 budget of 10000 ms | hidden 0/9 (stopped: time) |
| step 5 | extra-regions | diagonalX | easy | 1 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 10100..10119 | summary | - | I1: exactly one solution; I2: givens are part of the solution; I3: it obeys every rule | hidden 28/40 (stopped: misses) |
| step 5 | extra-regions | diagonalX | easy | 1 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 10100..10119 | summary | - | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: the clue count respects the spec | hidden 28/40 (stopped: misses) |
| step 5 | extra-regions | diagonalX | easy | 1 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 10100..10119 | summary | - | CV6: p95 of the generation time is within the design.md 9.1 budget of 200 ms | hidden 28/40 (stopped: misses) |
| step 5 | extra-regions | diagonalX | expert | 4 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 10400..10419 | summary | - | I1: exactly one solution; I2: givens are part of the solution; I3: it obeys every rule | hidden 37/40 |
| step 5 | extra-regions | diagonalX | expert | 4 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 10400..10419 | summary | - | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: the clue count respects the spec | hidden 37/40 |
| step 5 | extra-regions | diagonalX | expert | 4 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 10400..10419 | summary | - | CV6: p95 of the generation time is within the design.md 9.1 budget of 500 ms | hidden 37/40 |
| step 5 | extra-regions | diagonalX | hell1 | 7 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 10700..10719 | summary | - | I1: exactly one solution; I2: givens are part of the solution; I3: it obeys every rule | hidden 0/9 (stopped: time) |
| step 5 | extra-regions | diagonalX | hell1 | 7 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 10700..10719 | summary | - | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: the clue count respects the spec | hidden 0/9 (stopped: time) |
| step 5 | extra-regions | diagonalX | hell1 | 7 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 10700..10719 | summary | - | CV6: p95 of the generation time is within the design.md 9.1 budget of 3000 ms | hidden 0/9 (stopped: time) |
| step 5 | extra-regions | hyper | easy | 1 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 20100..20119 | summary | - | I1: exactly one solution; I2: givens are part of the solution; I3: it obeys every rule | hidden 29/40 (stopped: misses) |
| step 5 | extra-regions | hyper | easy | 1 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 20100..20119 | summary | - | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: the clue count respects the spec | hidden 29/40 (stopped: misses) |
| step 5 | extra-regions | hyper | easy | 1 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 20100..20119 | summary | - | CV6: p95 of the generation time is within the design.md 9.1 budget of 200 ms | hidden 29/40 (stopped: misses) |
| step 5 | extra-regions | hyper | expert | 4 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 20400..20419 | summary | - | I1: exactly one solution; I2: givens are part of the solution; I3: it obeys every rule | hidden 42/53 (stopped: misses) |
| step 5 | extra-regions | hyper | expert | 4 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 20400..20419 | summary | - | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: the clue count respects the spec | hidden 42/53 (stopped: misses) |
| step 5 | extra-regions | hyper | expert | 4 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 20400..20419 | summary | - | CV6: p95 of the generation time is within the design.md 9.1 budget of 500 ms | hidden 42/53 (stopped: misses) |
| step 5 | extra-regions | hyper | hell1 | 7 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 20700..20719 | summary | - | I1: exactly one solution; I2: givens are part of the solution; I3: it obeys every rule | hidden 0/9 (stopped: time) |
| step 5 | extra-regions | hyper | hell1 | 7 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 20700..20719 | summary | - | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: the clue count respects the spec | hidden 0/9 (stopped: time) |
| step 5 | extra-regions | hyper | hell1 | 7 | 20 | 10000 * (variantIndex + 1) + 100 * li + i = 20700..20719 | summary | - | CV6: p95 of the generation time is within the design.md 9.1 budget of 3000 ms | hidden 0/9 (stopped: time) |
| step 5 | wordoku | wordoku | normal | 2 | 20 | 100 * (li + 1) + i = 300..319 | summary | placement cycle: diagonal, diagonal, row, column | I1: exactly one solution (from the givens alone); I2: givens are part of the solution; I3: it satisfies every unit | hidden 35/46 (stopped: misses) |
| step 5 | wordoku | wordoku | normal | 2 | 20 | 100 * (li + 1) + i = 300..319 | summary | placement cycle: diagonal, diagonal, row, column | the word appears on the chosen line of the solution, letter by letter | hidden 35/46 (stopped: misses) |
| step 5 | wordoku | wordoku | normal | 2 | 20 | 100 * (li + 1) + i = 300..319 | summary | placement cycle: diagonal, diagonal, row, column | solving it reveals the word: the solver, from the givens alone, ends with the word on its line | hidden 35/46 (stopped: misses) |
| step 5 | wordoku | wordoku | normal | 2 | 20 | 100 * (li + 1) + i = 300..319 | summary | placement cycle: diagonal, diagonal, row, column | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: at least minClues givens, every unit its minimum | hidden 35/46 (stopped: misses) |
| step 5 | wordoku | wordoku | normal | 2 | 20 | 100 * (li + 1) + i = 300..319 | summary | placement cycle: diagonal, diagonal, row, column | the clues follow the symmetry of the configuration (rotational180), the word line included | hidden 35/46 (stopped: misses) |
| step 5 | wordoku | wordoku | normal | 2 | 20 | 100 * (li + 1) + i = 300..319 | summary | placement cycle: diagonal, diagonal, row, column | CV6: p95 of the generation time is within the design.md 9.1 budget of 250 ms | hidden 35/46 (stopped: misses) |
| step 5 | wordoku | wordoku | hell1 | 7 | 20 | 100 * (li + 1) + i = 800..819 | summary | placement cycle: diagonal, diagonal, row, column | I1: exactly one solution (from the givens alone); I2: givens are part of the solution; I3: it satisfies every unit | hidden 0/9 (stopped: time) |
| step 5 | wordoku | wordoku | hell1 | 7 | 20 | 100 * (li + 1) + i = 800..819 | summary | placement cycle: diagonal, diagonal, row, column | the word appears on the chosen line of the solution, letter by letter | hidden 0/9 (stopped: time) |
| step 5 | wordoku | wordoku | hell1 | 7 | 20 | 100 * (li + 1) + i = 800..819 | summary | placement cycle: diagonal, diagonal, row, column | solving it reveals the word: the solver, from the givens alone, ends with the word on its line | hidden 0/9 (stopped: time) |
| step 5 | wordoku | wordoku | hell1 | 7 | 20 | 100 * (li + 1) + i = 800..819 | summary | placement cycle: diagonal, diagonal, row, column | I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: at least minClues givens, every unit its minimum | hidden 0/9 (stopped: time) |
| step 5 | wordoku | wordoku | hell1 | 7 | 20 | 100 * (li + 1) + i = 800..819 | summary | placement cycle: diagonal, diagonal, row, column | the clues follow the symmetry of the configuration (rotational180), the word line included | hidden 0/9 (stopped: time) |
| step 5 | wordoku | wordoku | hell1 | 7 | 20 | 100 * (li + 1) + i = 800..819 | summary | placement cycle: diagonal, diagonal, row, column | CV6: p95 of the generation time is within the design.md 9.1 budget of 2500 ms | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | variants | classic9 | hell1 | 7 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 hell1 | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | variants | mega12 | hell1 | 7 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 hell1 | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | variants | mega16 | expert | 4 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 expert | hidden 35/40 (stopped: time) |
| checkpoint B (live support) | variants | mega16 | nightmare | 6 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 nightmare | hidden 25/25 (stopped: time) |
| checkpoint B (live support) | variants | mega16 | hell1 | 7 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 hell1 | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | variants | diagonalX | easy | 1 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 easy | hidden 28/40 (stopped: misses) |
| checkpoint B (live support) | variants | diagonalX | expert | 4 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 expert | hidden 37/40 |
| checkpoint B (live support) | variants | diagonalX | hell1 | 7 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 hell1 | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | variants | hyper | easy | 1 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 easy | hidden 29/40 (stopped: misses) |
| checkpoint B (live support) | variants | hyper | expert | 4 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 expert | hidden 42/53 (stopped: misses) |
| checkpoint B (live support) | variants | hyper | hell1 | 7 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 hell1 | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | variants | jigsaw9 | expert | 4 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 expert | hidden 30/34 (stopped: time) |
| checkpoint B (live support) | variants | jigsaw9 | nightmare | 6 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 nightmare | hidden 27/27 (stopped: time) |
| checkpoint B (live support) | variants | jigsaw9 | hell1 | 7 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 hell1 | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | variants | killer | hard | 3 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 hard | hidden 0/14 (stopped: misses) |
| checkpoint B (live support) | variants | killer | expert | 4 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 expert | hidden 2/12 (stopped: time) |
| checkpoint B (live support) | variants | killer | master | 5 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 master | hidden 11/14 (stopped: time) |
| checkpoint B (live support) | variants | killer | nightmare | 6 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 nightmare | hidden 18/22 (stopped: time) |
| checkpoint B (live support) | variants | killer | hell1 | 7 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 hell1 | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | variants | killer | hell2 | 8 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 hell2 | hidden 40/40 (stopped: time) |
| checkpoint B (live support) | variants | greaterThan | normal | 2 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 normal | hidden 40/40 |
| checkpoint B (live support) | variants | greaterThan | expert | 4 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 expert | hidden 38/40 (stopped: time) |
| checkpoint B (live support) | variants | greaterThan | nightmare | 6 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 nightmare | hidden 13/13 (stopped: time) |
| checkpoint B (live support) | variants | greaterThan | hell1 | 7 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 hell1 | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | variants | samurai | easy | 1 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 easy | hidden 10/22 (stopped: misses) |
| checkpoint B (live support) | variants | samurai | nightmare | 6 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 nightmare | hidden 14/17 (stopped: time) |
| checkpoint B (live support) | variants | samurai | hell1 | 7 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 hell1 | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | variants | samurai | hell2 | 8 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 hell2 | hidden 40/40 (stopped: time) |
| checkpoint B (live support) | variants | sohei | easy | 1 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 easy | hidden 4/18 (stopped: misses) |
| checkpoint B (live support) | variants | sohei | nightmare | 6 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 nightmare | hidden 29/30 (stopped: time) |
| checkpoint B (live support) | variants | sohei | hell1 | 7 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 hell1 | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | variants | butterfly | easy | 1 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 easy | hidden 1/15 (stopped: misses) |
| checkpoint B (live support) | variants | butterfly | hell1 | 7 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 hell1 | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | variants | flower | easy | 1 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 easy | hidden 0/14 (stopped: misses) |
| checkpoint B (live support) | variants | flower | expert | 4 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 expert | hidden 23/35 (stopped: misses) |
| checkpoint B (live support) | variants | flower | nightmare | 6 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 nightmare | hidden 42/50 (stopped: time) |
| checkpoint B (live support) | variants | flower | hell1 | 7 | 2 | i + 1 (the seeds 1..perLevel) = 1..2 | off | - | CV3 hell1 | hidden 0/9 (stopped: time) |
| checkpoint B (live support) | variants | wordoku | normal | 2 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 normal | hidden 35/46 (stopped: misses) |
| checkpoint B (live support) | variants | wordoku | hell1 | 7 | 3 | i + 1 (the seeds 1..perLevel) = 1..3 | off | - | CV3 hell1 | hidden 0/9 (stopped: time) |

## Other registrations that disappeared or appeared (27)

| change | suite | test |
|---|---|---|
| removed step 5 | greater-than | greater-than > greaterThan: variant definition and model (CV1, CV2) > offers every level of the nine, hell2 included (measured by tests/qualify.js) |
| removed step 5 | extra-regions | extra-regions > extraRegions: variant definitions (design.md 5.3 / 13.8) > supports every difficulty level, hell2 included (measured by tests/qualify.js) |
| removed step 5 | wordoku | wordoku > wordoku: variant definition and model (CV1, CV2) > does not support hell2 (it missed the qualification): asking for it is refused |
| removed step 5 | perf | perf > perf: generation time against design.md section 9.1 (warn only, 5 runs per cell) > wordoku/normal: p95 within the target of design.md 9.1 |
| removed step 5 | perf | perf > perf: generation time against design.md section 9.1 (warn only, 5 runs per cell) > greaterThan/normal: p95 within the target of design.md 9.1 |
| removed step 5 (renamed or replaced) | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the selectors of the early gates pick exactly one test > killer: "> <level>: <count> puzzles > I5:" selects one test per level |
| removed step 5 (renamed or replaced) | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the selectors of the early gates pick exactly one test > jigsaw: "> <level>: <count> puzzles > I5:" selects one test per level |
| removed step 5 (renamed or replaced) | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the selectors of the early gates pick exactly one test > greater-than: "> <level>: <count> puzzles > I5:" selects one test per level |
| removed step 5 (renamed or replaced) | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the selectors of the early gates pick exactly one test > wordoku: "> <level>: <count> puzzles > I5:" selects one test per level |
| removed step 5 (renamed or replaced) | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the selectors of the early gates pick exactly one test > extra-regions: "> <variant> <level>: <count> puzzles > I5:" selects one test per variant and level |
| added | greater-than | greater-than > greaterThan: variant definition and model (CV1, CV2) > offers the levels of the final qualification and refuses the others (measured by tests/qualify.js) |
| added | extra-regions | extra-regions > extraRegions: variant definitions (design.md 5.3 / 13.8) > offers the levels of the final qualification and refuses the others (measured by tests/qualify.js) |
| added | wordoku | wordoku > wordoku: variant definition and model (CV1, CV2) > refuses every level that the final qualification does not offer: normal, hell1 and hell2 |
| added | perf | perf > perf: generation time against design.md section 9.1 (warn only, 5 runs per cell) > wordoku/easy: p95 within the target of design.md 9.1 |
| added | perf | perf > perf: generation time against design.md section 9.1 (warn only, 5 runs per cell) > greaterThan/easy: p95 within the target of design.md 9.1 |
| added | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the selectors of the early gates pick exactly one test > killer: "> <level>: <count> puzzles > I5:" selects one test per published level, none for a hidden one |
| added | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the selectors of the early gates pick exactly one test > jigsaw: "> <level>: <count> puzzles > I5:" selects one test per published level, none for a hidden one |
| added | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the selectors of the early gates pick exactly one test > greater-than: "> <level>: <count> puzzles > I5:" selects one test per published level, none for a hidden one |
| added | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the selectors of the early gates pick exactly one test > wordoku: "> <level>: <count> puzzles > I5:" selects one test per published level, none for a hidden one |
| added | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the selectors of the early gates pick exactly one test > extra-regions: "> <variant> <level>: <count> puzzles > I5:" selects one test per variant and published level, none for a hidden one |
| added | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the fixed diagnostic corpora keep their ladder, seeds and guard (MS18c) > lists the fixed ladder and the published levels of every suite: killer and extra-regions nine, wordoku eight, and no corpus is built by reading the lazy keys |
| added | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the fixed diagnostic corpora keep their ladder, seeds and guard (MS18c) > builds every hidden level inside the per-call guard: the requested tuple, no unsupported-level error, the very support array put back, and an unguarded request still refused |
| added | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the fixed diagnostic corpora keep their ladder, seeds and guard (MS18c) > puts the exact support array back when a build throws, and publishes nothing of that level |
| added | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the fixed diagnostic corpora keep their ladder, seeds and guard (MS18c) > would notice an unguarded build: a probe of greater-than without its guard is refused for a hidden level and not for an offered one |
| added | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the fixed diagnostic corpora keep their ladder, seeds and guard (MS18c) > keeps the witness populations of the cross-level assertions: Greater-Than 20 + 10 + 10, Killer Hard and Master, Wordoku Normal seed 302, and the hybrid of 72 requests |
| added | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the performance table and its smoke cells follow the published offers (MS18c) > has one positive, unchanged target for each of the 79 offered cells of the registry and none for the 56 others (39 removed, 17 never offered) |
| added | manual-corpus | manual-corpus > manual corpora: the adapters of the manual suites, read in memory (Node only) > the performance table and its smoke cells follow the published offers (MS18c) > keeps 19 unique smoke cells, all active, with exactly two substitutions: greaterThan/normal to greaterThan/easy and wordoku/normal to wordoku/easy |

## Tests that keep their ID and follow the offers

| suite | test | change |
|---|---|---|
| killer | CV6: the 95th percentile of the generation time stays inside the killer row of design.md 9.1 | the per-level budget checks of the hidden levels are not public: it asserts the published veryEasy, easy and normal only |
| killer | CV3: every supported level yields its puzzles of that variant | retained over the fixed nine-level corpus (the corpus integrity every diagnostic consumer relies on) |
| killer, jigsaw, greater-than, extra-regions, wordoku | the variant definition tests | assert the published list and the refusal of its complement (the nine-level catalogue); GT, extra-regions and wordoku also changed title, see above |
| killer, jigsaw, greater-than, extra-regions, wordoku | every fixed or corpus request | built inside the per-call withRequestedLevel guard (generate / trace / digFrom / spec reads) |
| extra-regions | the check can tell: a classic9 puzzle keeps its unique solution on the classic board | a public-support control that follows the offers, not a fixed diagnostic population: it iterates classic9's live support, 7 levels since B (veryEasy to nightmare), so Hell 1 (seed 707, global level index 7) is no longer generated; the seeds of the 7 remaining levels are unchanged (700 + global level index, the values of the former array index); no seed is compacted |
| perf | every cell of the table is a variant and a level that the variant offers | unchanged; it now holds because the 39 hidden targets are null |
| recovery-profile (quick) | the three fixed requests | guards in caseOf, prepare and profile; G13 stays samurai nightmare 42; one focused test added |

The removed per-level budget checks of Killer CV6:

| level | budget (ms) | GQ verdict |
|---|---|---|
| hard | 1800 | hidden 0/14 (stopped: misses) |
| expert | 10000 | hidden 2/12 (stopped: time) |
| master | 10000 | hidden 11/14 (stopped: time) |
| nightmare | 10000 | hidden 18/22 (stopped: time) |
| hell1 | 10000 | hidden 0/9 (stopped: time) |
| hell2 | 10000 | hidden 40/40 (stopped: time) |

## Retained fixed diagnostic corpora

### killer / killer: 9 levels, 6 hidden (built inside the per-call guard)

| level | original index | count | seeds | offered | GQ verdict |
|---|---|---|---|---|---|
| veryEasy | 0 | 20 | 1..20 | yes | offered 40/40 |
| easy | 1 | 20 | 1..20 | yes | offered 40/40 |
| normal | 2 | 20 | 1..20 | yes | offered 38/40 |
| hard | 3 | 20 | 1..20 | no | hidden 0/14 (stopped: misses) |
| expert | 4 | 8 | 1..8 | no | hidden 2/12 (stopped: time) |
| master | 5 | 8 | 1..8 | no | hidden 11/14 (stopped: time) |
| nightmare | 6 | 8 | 1..8 | no | hidden 18/22 (stopped: time) |
| hell1 | 7 | 8 | 1..8 | no | hidden 0/9 (stopped: time) |
| hell2 | 8 | 8 | 1..8 | no | hidden 40/40 (stopped: time) |

### jigsaw / jigsaw9: 9 levels, 3 hidden (built inside the per-call guard)

| level | original index | count | seeds | offered | GQ verdict |
|---|---|---|---|---|---|
| veryEasy | 0 | 20 | 700..719 | yes | offered 40/40 |
| easy | 1 | 20 | 800..819 | yes | offered 40/40 |
| normal | 2 | 20 | 900..919 | yes | offered 40/40 |
| hard | 3 | 20 | 1000..1019 | yes | offered 40/40 |
| expert | 4 | 20 | 1100..1119 | no | hidden 30/34 (stopped: time) |
| master | 5 | 20 | 1200..1219 | yes | offered 40/40 |
| nightmare | 6 | 20 | 1300..1319 | no | hidden 27/27 (stopped: time) |
| hell1 | 7 | 20 | 1400..1419 | no | hidden 0/9 (stopped: time) |
| hell2 | 8 | 8 | 1500..1507 | yes | offered 40/40 |

### greater-than / greaterThan: 9 levels, 4 hidden (built inside the per-call guard)

| level | original index | count | seeds | offered | GQ verdict |
|---|---|---|---|---|---|
| veryEasy | 0 | 20 | 100..119 | yes | offered 40/40 |
| easy | 1 | 20 | 200..219 | yes | offered 40/40 |
| normal | 2 | 20 | 300..319 | no | hidden 40/40 |
| hard | 3 | 10 | 400..409 | yes | offered 40/40 |
| expert | 4 | 10 | 500..509 | no | hidden 38/40 (stopped: time) |
| master | 5 | 10 | 600..609 | yes | offered 40/40 |
| nightmare | 6 | 10 | 700..709 | no | hidden 13/13 (stopped: time) |
| hell1 | 7 | 10 | 800..809 | no | hidden 0/9 (stopped: time) |
| hell2 | 8 | 10 | 900..909 | yes | offered 40/40 |

### extra-regions / diagonalX: 9 levels, 3 hidden (built inside the per-call guard)

| level | original index | count | seeds | offered | GQ verdict |
|---|---|---|---|---|---|
| veryEasy | 0 | 20 | 10000..10019 | yes | offered 40/40 |
| easy | 1 | 20 | 10100..10119 | no | hidden 28/40 (stopped: misses) |
| normal | 2 | 20 | 10200..10219 | yes | offered 40/40 |
| hard | 3 | 20 | 10300..10319 | yes | offered 40/40 |
| expert | 4 | 20 | 10400..10419 | no | hidden 37/40 |
| master | 5 | 20 | 10500..10519 | yes | offered 40/40 |
| nightmare | 6 | 20 | 10600..10619 | yes | offered 40/40 |
| hell1 | 7 | 20 | 10700..10719 | no | hidden 0/9 (stopped: time) |
| hell2 | 8 | 8 | 10800..10807 | yes | offered 40/40 |

### extra-regions / hyper: 9 levels, 3 hidden (built inside the per-call guard)

| level | original index | count | seeds | offered | GQ verdict |
|---|---|---|---|---|---|
| veryEasy | 0 | 20 | 20000..20019 | yes | offered 40/40 |
| easy | 1 | 20 | 20100..20119 | no | hidden 29/40 (stopped: misses) |
| normal | 2 | 20 | 20200..20219 | yes | offered 40/40 |
| hard | 3 | 20 | 20300..20319 | yes | offered 40/40 |
| expert | 4 | 20 | 20400..20419 | no | hidden 42/53 (stopped: misses) |
| master | 5 | 20 | 20500..20519 | yes | offered 40/40 |
| nightmare | 6 | 20 | 20600..20619 | yes | offered 40/40 |
| hell1 | 7 | 20 | 20700..20719 | no | hidden 0/9 (stopped: time) |
| hell2 | 8 | 8 | 20800..20807 | yes | offered 40/40 |

### wordoku / wordoku: 8 levels, 2 hidden (built inside the per-call guard)

| level | original index | count | seeds | offered | GQ verdict |
|---|---|---|---|---|---|
| veryEasy | 0 | 20 | 100..119 | yes | offered 40/40 |
| easy | 1 | 20 | 200..219 | yes | offered 40/40 |
| normal | 2 | 20 | 300..319 | no | hidden 35/46 (stopped: misses) |
| hard | 3 | 20 | 400..419 | yes | offered 40/40 |
| expert | 4 | 20 | 500..519 | yes | offered 40/40 |
| master | 5 | 20 | 600..619 | yes | offered 40/40 |
| nightmare | 6 | 20 | 700..719 | yes | offered 40/40 |
| hell1 | 7 | 20 | 800..819 | no | hidden 0/9 (stopped: time) |

## Refusal complements (the published levels out of the nine)

| variant | offered | refused |
|---|---|---|
| classic4 | veryEasy | easy, normal, hard, expert, master, nightmare, hell1, hell2 |
| classic6 | veryEasy, hard | easy, normal, expert, master, nightmare, hell1, hell2 |
| classic9 | veryEasy, easy, normal, hard, expert, master, nightmare | hell1, hell2 |
| mega12 | veryEasy, easy, normal, hard, expert, master, nightmare, hell2 | hell1 |
| mega16 | veryEasy, easy, normal, hard, master, hell2 | expert, nightmare, hell1 |
| diagonalX | veryEasy, normal, hard, master, nightmare, hell2 | easy, expert, hell1 |
| hyper | veryEasy, normal, hard, master, nightmare, hell2 | easy, expert, hell1 |
| jigsaw9 | veryEasy, easy, normal, hard, master, hell2 | expert, nightmare, hell1 |
| killer | veryEasy, easy, normal | hard, expert, master, nightmare, hell1, hell2 |
| greaterThan | veryEasy, easy, hard, master, hell2 | normal, expert, nightmare, hell1 |
| samurai | veryEasy, normal, hard, expert, master | easy, nightmare, hell1, hell2 |
| sohei | veryEasy, normal, hard, expert, master, hell2 | easy, nightmare, hell1 |
| butterfly | veryEasy, normal, hard, expert, master, nightmare, hell2 | easy, hell1 |
| flower | veryEasy, normal, hard, master, hell2 | easy, expert, nightmare, hell1 |
| wordoku | veryEasy, easy, hard, expert, master, nightmare | normal, hell1, hell2 |

## Performance table: 79 active targets, 39 removed, 17 never offered

| cell | old target (ms) | new | GQ verdict |
|---|---|---|---|
| classic9/hell1 | 2500 | null | hidden 0/9 (stopped: time) |
| diagonalX/easy | 200 | null | hidden 28/40 (stopped: misses) |
| diagonalX/expert | 500 | null | hidden 37/40 |
| diagonalX/hell1 | 3000 | null | hidden 0/9 (stopped: time) |
| hyper/easy | 200 | null | hidden 29/40 (stopped: misses) |
| hyper/expert | 500 | null | hidden 42/53 (stopped: misses) |
| hyper/hell1 | 3000 | null | hidden 0/9 (stopped: time) |
| jigsaw9/expert | 900 | null | hidden 30/34 (stopped: time) |
| jigsaw9/nightmare | 5000 | null | hidden 27/27 (stopped: time) |
| jigsaw9/hell1 | 5000 | null | hidden 0/9 (stopped: time) |
| wordoku/normal | 250 | null | hidden 35/46 (stopped: misses) |
| wordoku/hell1 | 2500 | null | hidden 0/9 (stopped: time) |
| killer/hard | 1800 | null | hidden 0/14 (stopped: misses) |
| killer/expert | 10000 | null | hidden 2/12 (stopped: time) |
| killer/master | 10000 | null | hidden 11/14 (stopped: time) |
| killer/nightmare | 10000 | null | hidden 18/22 (stopped: time) |
| killer/hell1 | 10000 | null | hidden 0/9 (stopped: time) |
| killer/hell2 | 10000 | null | hidden 40/40 (stopped: time) |
| greaterThan/normal | 700 | null | hidden 40/40 |
| greaterThan/expert | 10000 | null | hidden 38/40 (stopped: time) |
| greaterThan/nightmare | 10000 | null | hidden 13/13 (stopped: time) |
| greaterThan/hell1 | 10000 | null | hidden 0/9 (stopped: time) |
| mega12/hell1 | 4500 | null | hidden 0/9 (stopped: time) |
| mega16/expert | 10000 | null | hidden 35/40 (stopped: time) |
| mega16/nightmare | 10000 | null | hidden 25/25 (stopped: time) |
| mega16/hell1 | 10000 | null | hidden 0/9 (stopped: time) |
| butterfly/easy | 3000 | null | hidden 1/15 (stopped: misses) |
| butterfly/hell1 | 8000 | null | hidden 0/9 (stopped: time) |
| samurai/easy | 8000 | null | hidden 10/22 (stopped: misses) |
| samurai/nightmare | 20000 | null | hidden 14/17 (stopped: time) |
| samurai/hell1 | 20000 | null | hidden 0/9 (stopped: time) |
| samurai/hell2 | 30000 | null | hidden 40/40 (stopped: time) |
| flower/easy | 8000 | null | hidden 0/14 (stopped: misses) |
| flower/expert | 20000 | null | hidden 23/35 (stopped: misses) |
| flower/nightmare | 20000 | null | hidden 42/50 (stopped: time) |
| flower/hell1 | 20000 | null | hidden 0/9 (stopped: time) |
| sohei/easy | 8000 | null | hidden 4/18 (stopped: misses) |
| sohei/nightmare | 20000 | null | hidden 29/30 (stopped: time) |
| sohei/hell1 | 20000 | null | hidden 0/9 (stopped: time) |

Smoke cells (19 unique, warn only): the two substitutions:

| removed | replacement | removed cell GQ | replacement GQ |
|---|---|---|---|
| wordoku/normal | wordoku/easy | hidden 35/46 (stopped: misses) | offered 40/40 |
| greaterThan/normal | greaterThan/easy | hidden 40/40 | offered 40/40 |

## Recovery profile

Old `toolHash` `47110866ae0c0f0b05977ff05fd5804416f86249087c57b88954a02d3c968066`, new `c7e90ca9d0815255e945da6ffe4d513733fe886dcf2698157765715577957bdf` (the tool's own recipe: the
files of `TOOL_FILES`, each as `<path>\0<text with LF ends>`). Changed files: `tests/difficulty-recovery.js`, `tests/fixtures/recovery-profile.js`, `tests/fixtures/tool-records.js`. The CLI now also loads `tests/fixtures/tool-records.js`
(the guard) and hashes it. No request of the three cases changes.

| file | new sha256 (LF text) | old sha256 |
|---|---|---|
| tests/difficulty-recovery.js | 84dfacdb146777d3909aac8190dde2e21673f522135b70e47206dbe49aff8c1b | e2d99997546667b1188a2b9f4a2e548bf053974a824262955fa0f3eebe8470f9 |
| tests/fixtures/recovery-profile.js | 430b325f24b96e57ae2b96fa3a0e1c68dc906eab872a0ac230e8b1207f8168b3 | fc32f1f7e25ec80ee7d234cef61ec8578cec4a8ea2d5159dfacbdcdfb4336b44 |
| tests/replay-fixtures.js | ada7cb9404993fe4f4d3fd996bb7b1c8436069b2b4cafa1a1cd57899a0512f82 | ada7cb9404993fe4f4d3fd996bb7b1c8436069b2b4cafa1a1cd57899a0512f82 |
| tests/fixtures/replay-goldens.js | 72b016382acea075e6423c08c7495942001df064169f69c34ce609281758d406 | 72b016382acea075e6423c08c7495942001df064169f69c34ce609281758d406 |
| tests/fixtures/tool-records.js | 21113d14d685dab1b3d71461e0c3ff27b03086f827d86cfb1f136cd6e87a21ae | (not in the old list) |

No problem found.
