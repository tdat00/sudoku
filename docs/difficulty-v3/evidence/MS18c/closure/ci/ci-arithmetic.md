# MS18c closure: CI projection arithmetic

Rule (check-list, "Maintaining CI quick projections"): `new = max(old, 10 x ceil(1.5 x m / 10))`, raises only,
`m` the process seconds of the shard in the complete successful run on the final source
(`closure/quick-dev`, Generator fingerprint `fc31c9db...`, Player fingerprint `4c21573f...`, all nine results
`complete` and `sourceStable`). `quick-pre` ran before the compatibility edits were complete (own-fast 83, digger-target 3,
pipeline 5 and mega 6 failures) and is not a basis.

| shard | m (s) | 1.5 m | rule | old | new |
|---|---|---|---|---|---|
| core-shared | 102.9 | 154.4 | 160 | 170 | 170 |
| steps | 44.4 | 66.6 | 70 | 70 | 70 |
| replay | 42.9 | 64.4 | 70 | 70 | 70 |
| mega | 31.5 | 47.3 | 50 | 50 | 50 |
| own-fast | 219.1 | 328.7 | 330 | 330 | 330 |
| digger-target | 2.7 | 4.1 | 10 | 30 | 30 |
| pipeline | 42.7 | 64.1 | 70 | 80 | 80 |
| player (Generator shard) | 58.2 | 87.3 | 90 | 90 | 90 |
| Player job (whole quick process) | 118.7 | 178.1 | 180 | 180 | 180 |

No projection rises. Counts and measured seconds are information: steps 59, replay 159, own-fast 1,767, player 70.

Job arithmetic (`180 + 3 x sum(projectionSeconds)`, factor and overhead unchanged), all from `ci-check.txt`:

| job | projection sum | projected | actual workflow limit |
|---|---|---|---|
| shared-small | 360 | 1,260 s | 1,800 s (30 min) |
| own-suites | 360 | 1,260 s | 1,800 s |
| pipeline | 80 | 420 s | 1,800 s |
| replay-player | 90 | 450 s | 1,800 s |
| Player job | 180 | 720 s | 900 s (15 min, `pull-request.yml:103`, `pages.yml:109`) |

`generator-suites.sh check` through Git's bash: exit 0, 4,807 of 4,807 Generator quick tests in exactly one shard,
Player 2,981 tests in 32 suites. Matching-head CI on GitHub is the orchestrator's and MS18e's.
