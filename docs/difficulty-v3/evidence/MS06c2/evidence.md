# MS06c2 evidence: one originating target in every search stage

Developer evidence of task MS06c2 (branch `rating-v3`, base HEAD `9563c63` = MS06c1; no Git action was taken). Started
2026-11-14 20:38 (+07:00); the source was final at 21:15 and E ran on it. A fix round after SA1's review
(`claude-opus-5.5/14-review-of-ms06c2.md`, IR45-IR49, section 8) changed two test specimens, the locale and help wording and
this text, re-recorded the GR ledgers and repeated the final quick runs; the runs below are those of the fix round. The earlier
sets are kept as `quick/preliminary/` (before the last documentation edits; only its `results-pipeline.json`) and
`quick/previous-final/` (the first final set, results only).

## 1. Source identity

- **GG** (520 regression hashes) was recorded from the final engine sources: the 104 ledgers carry `sourceHash`
  `2cbaaf3011edad0f98a0f5bc28a482a53585d96f3e5ae672058b2042d1c7348f`, SHA-256 over the 45 engine files of `SOURCE_FILES` plus
  `perf-helper.js`, `tool-records.js` and `perf.js` (no UI file), so the fix round does not touch it.
- **GR** (5 wires, 14 analyses) carries the identity of all 63 `SOURCE_FILES` plus the recorder files. The first ledgers
  (`e6cba0fc...`) are kept in `fix-round/superseded-ledgers/`; the fix round edits `locale.en.js`, `locale.vi.js` and `help.js`, which
  are among those files, so the 19 shards were recorded again on the final sources (`fix-round/compound-wire-r2.txt`,
  `compound-analysis-r2.txt`): `2ffc4c83e1b04e0c310048af651a2bfb8a536edc40ee9d3c7a2b13dcc30624c8`. The published fixtures are
  byte for byte the same ("up to date", `fix-round/wire-check-r2.txt`, `analysis-check-r2.txt`).
- `e-final-identity-check.txt` re-runs the three merge checks on the final tree: 520 keys, 5 wires and 14 analyses are
  "recorded from the current sources" and match the published fixtures.
- Quick-run fingerprints (the runner's `sourceHash` over its 160 files, `sourceStable: true` in every result file): Generator
  `6867bdb2f27cd9835fc1d1d08f2ff058133f1def1f11b49dd915aa262de62a1e` (it was `9bcc6343...` before the fix round), Player
  `e764236e8c2f9bcdcc47ff2810fff16414647562a13db1325cc80e94bcaabdf1` (unchanged). The inventories of `quick/` carry the same two.
- `greater-than.js` is not edited. No weight, band, cap, floor or offer is changed.

## 2. What changed in the source

`digger.js` (the only engine file; `pipeline.js` has its result comment corrected):

- **One draw, one route.** Each sample that `generate` enters draws its own target from its own child stream
  (`rng.fork('dig#<attempt>.<t>')`, then `targetPolicy.targetFor`) and passes it in `options.target`, overriding a copied
  caller value (IR39(b)); a lower-level `digLevel` / `digLevelSteps` call keeps an explicit value (number, zero, `null`, `NaN`
  to `null`) and initialises only an absent one, once; raw dig stages never initialise. A local search continues with
  `attemptBest.target` (null included), and every context gets the original keeper through `keeperView`.
- **Guided pass (cells strategy).** The pass evaluates its own board once (`oracleCalls` counted once, guarded; refused or capped
  ends the pass on the input board), seeds the pool with the first success, prefers `tierUsed` and then the score nearer the
  sample's target (higher with a `null` target), and applies the winner only if `applyBounded` allows it, else ends the pass
  with exactly one end record and no further solve, draw or proposal. All-refused and empty pools terminate; proposals keep their
  priority order; traces stay numeric. The temporary numeric adapter of MS06c1 is gone.
- **Refinement and local search, together.** `refineDown` is not entered for a model with signs. Above the band a reveal is
  accepted as before (solved, at least the band minimum). From an exact state in the band it goes on while the state's score is
  above a finite target and keeps only exact, in-band reveals strictly nearer the target (`acceptReveal`; in the tests 1100 to 920
  to 880, with 900, 840 and 690 undone). The 64-rating allowance is the same and every solved candidate is still offered to the
  keeper. The local search follows a
  neighbour only if `preferRated` (lower quality, then nearer an upper target; an exact tie is not followed) and keeps the
  keeper offer before the predicate, the first-exact stop, every cap and the shallow allowance.
- **Greater-Than** transports the target and does not consume it (CV6-05); the first-allowed sign dig compares nothing.
- Texts: `explain.dig.how`, `explain.dig.code.deeper` and `dig.keep` (English and Vietnamese). Documentation: `design.md` 6.8,
  7.2, 13.9, 13.13, 15.2, 15.3 (I4), both developer guides, `.github/scripts/generator-quick.json`, `docs/difficulty-v3/notes.md`.

## 3. Complete E

### 3.1 GG: 520 regression hashes, 104 shards (all exit 0, every shard inside its projection)

194 of 520 puzzles changed, 20 keys of 26 (merged by `perf.js --hash-merge`, `hash-check-before-write.txt`; fixture written,
then 520 unchanged):

| key | seeds changed of 20 | | key | seeds changed of 20 |
|---|---|---|---|---|
| classic6/hard | 5 | | jigsaw9/normal | 9 |
| classic9/easy | 1 | | jigsaw9/master | 15 |
| classic9/normal | 6 | | killer/easy | 20 |
| classic9/hard | 10 | | killer/hard | 3 |
| classic9/expert | 10 | | samurai/easy | 15 |
| classic9/master | 12 | | butterfly/normal | 13 |
| classic9/nightmare | 6 | | flower/normal | 11 |
| mega12/normal | 14 | | wordoku/normal | 8 |
| mega16/easy | 17 | | diagonalX/easy | 2 |
| hyper/hard | 9 | | diagonalX/nightmare | 8 |

Unchanged keys (six, 120 hashes): `classic4/veryEasy`, `classic6/veryEasy`, `classic9/veryEasy`, `sohei/veryEasy` (the clue floor
is above the 38 clues where the guided stage starts, so the stage hands over at the floor and every guided pool is empty; no
stage compares candidates) and `greaterThan/normal`, `greaterThan/hard` (the first-allowed sign dig ignores the target, and a
Greater-Than local search rates almost nothing: in G11 and G12 every sample missed and each search spent 32,768 proposals on 0
to 2 ratings, so no new rule decides).

Why the others changed (by mechanism; the old puzzles exist only as hashes, so no per-puzzle attribution was measured):
a seed now gives another puzzle by design, because the guided pass picks the candidate nearest the sample's own target
inside the best tier and may end on the apply table instead of always taking the highest score, the refinement, from an exact
state in the band, goes on towards the target while that keeps the level, and the local search no longer follows an
equal-quality or farther neighbour. A key changes where its level has a bounded band and its dig runs those stages: all six
classic9 levels from Easy to Nightmare, the bounded levels of the larger and other boards in the table, and Killer Easy in
full (its dig strategy `digKiller`, `killer.js:1009-1019`, runs `digStage` with the guided stage at every level and no per-unit
clue floor, so the guided pass, stopped by the score band, decides every seed; the cage-layout search only rates layouts);
the sparse keys (classic9/easy 1, diagonalX/easy 2, killer/hard 3) are seeds whose passes or searches reached the new rules.

### 3.2 GR wires G09-G13 (5 ledgers; published, checked)

Puzzles and ratings are unchanged; the differing fields (`wire-check-before-write.txt`):

| id | fields | what |
|---|---|---|
| G09 Killer Expert | 10 | `target` null to 825.5728618241847; `ratings` and the local searches' `ratings` / `shallowRatings` of attempts 4, 5, 6 |
| G10 Killer Nightmare | 16 | `target` 1960.0198163185269; work of attempts 0, 3, 7, where the `capHit` of two searches swaps between `shallow` and `proposals` (ratings 276 to 389, 718 to 567, 104 to 319) |
| G11 Greater-Than Expert | 1 | `target` 778.7345429183915 (transported, not consumed) |
| G12 Greater-Than Hard | 1 | `target` 630.8390314923599 |
| G13 Samurai Nightmare | 5 | `target` 1960.0198163185269; `proposals` of attempts 0 and 1 |

The work counters move because the local searches now visit neighbours in the new order (plateaus are not followed); the
kept puzzle is the same.

### 3.3 GR analyses G01-G14 (14 ledgers; published, checked)

G02, G03, G07-G14 match. Changed (`analysis-check-before-write.txt`): G01 (Classic 9x9 Expert 3275974478) 78 fields, 33 to 29
details steps, no exchanges; G04 (Hell 1 2400651925) 60 fields, 43 to 29; G05 (Hell 1 2299986211) 68 fields, 77 to 29;
G06 (Jigsaw Nightmare 42) 5 fields. G01, G04 and G05 are new puzzles of the same seeds (in G04 the compact audit has one
inserted, bridged edge, `remaining: false`); G05's 77-step path with its long local search is now a 29-step guided path; G06 is a
new puzzle too, differing in its last guided removal (the final score 2,348 to 2,336 with the same 55 empty cells: a
deterministic rating of one board cannot change, so the board did). G07 (Jigsaw Nightmare 3962167687) still has 2 exchanges
and is the specimen for exchange moves.

Times (`shard-runs.jsonl`): GG 104 shards 522.0 s in two compounds (400.6 s and 121.7 s), longest 42.0 s; wires 71.3 s;
analyses 86.7 s; no shard above its projection, no non-zero exit.

## 4. Tests and pins

- `digger-target` 55 to 75 tests (strict equality throughout): the activation cases listed in `design.md` 15.2; the three IR39
  tests migrated to the sample's own draw; the real `signs` route (CC02, Greater-Than Expert seed 319) with probes at targets
  null, 0, 1e9 and 1 proving no consumption.
- Migrated: `pipeline` (152 to 154; local-policy tests, tune verdicts carry the sample's draw, the REAL premise request moved
  from seed 1 to seed 5, see section 7), `cache`, `worker`, `difficulty-diagnostics`.
- Pins re-derived from the refreshed goldens: `replay` (153 to 154), `replay-recorders`, `steps`, `player`. The facts of the
  live goldens are in `pins/probe-goldens-all.txt` (G01-G14, `probe-goldens.cjs ... explain`, recorded in the fix round). The
  probes of the step and player texts were temporary test cases that were removed again and their output was not captured; the
  migrated assertions of `steps.test.js` and `player.test.js` pin those texts. Where a golden
  lost the feature a test used (a 4-part jump with restores, exchanges in G01, a restored culprit) the test uses another
  specimen: exchanges from G07, the 4-part probe order on a synthetic 4x4 exchange, the 4-part sentence on a synthetic cause,
  and, for the restored culprit (`steps` and `player`), the exchange step of G07 (two clues removed, two shown again) whose
  transition is made a jump with a restored culprit (section 8, IR48).

## 5. Quick runs (final tree of the fix round, one CI group per locked command)

| group | tests | process s | run |
|---|---|---|---|
| shared-small (19 suites) | 1,465 | 66.5 | `quick/quick-shared-small.txt` |
| own-suites (30 suites; own-fast 1,583 + digger-target 75) | 1,658 | 167.9 | `quick/quick-own-suites.txt` |
| pipeline | 154 | 322.9 | `quick/quick-pipeline.txt` |
| replay-player | 69 | 133.4 | `quick/quick-replay-player.txt` |
| Generator total | 3,346 of 3,346 | 690.7 | fingerprint `6867bdb2...` |
| Player quick set (30 suites) | 1,683 of 1,683 | 31.9 | `quick/quick-player.txt`, fingerprint `e764236e...` |

`ci-check.txt`: `generator-suites.sh check` exit 0, 3,346 of 3,346 tests in exactly one shard, groups projected 630, 930, 1,260
and 720 s of 1,800 s, Player job 360 s. Results of every run, with the fingerprints: `quick/results-*.json`. The first
final set (fingerprint `9bcc6343...`, 695.6 s: 66.9, 168.2, 327.2 and 133.2 s) is in `quick/previous-final/`.

**T01 and the shard** (`quick/digger-target-t01.txt`, `results-digger-target.json`): the test "every invocation gets the own
target of its sample; the result carries the one of its origin" takes 265 ms (247 ms in the first final run); the whole
`digger-target` shard is 75 tests in 1.45 s alone (1.18 s in its group), against the 30 s bound.

## 6. Named items (S-OD4; numbers, not stops)

1. **S-AV08, the standing quick cost: a mixed generation cost of the active policy, for MS06d and MS07e.** The per-test
   times of MS06c1 are recorded (`evidence/MS06c1/quick/generator-*.json`, same machine, AMD EPYC 7763, 16 cores, time factor 2),
   so the rise is attributed test by test. The four Generator groups total 690.7 s against 653.8 s at MS06c1 (the sum of its
   four logged group times; +36.9 s, +5.6 %; the first final run of this task, which SA1 reviewed, was 695.6 s, +41.9 s).
   - **`pipeline`** (148 of its 152 tests exist in both runs): +35.8 s by the per-test sum in this run (286.6 to 322.4 s;
     +40.2 s in the first final run), all of it in four tests that generate puzzles. The three instrumentation-cost tests
     (classic9 Easy seeds 1 to 24 and Normal seeds 1 and 2, generated again and again) went from 75.0, 75.6 and 75.7 s to 86.6,
     86.8 and 87.1 s (+15 %; 88.4, 88.4 and 88.0 s, +16 % to +18 %, in the first run) and "classic9, every level, several seeds"
     from 18.2 to 22.0 s (+21 %). The other 144 tests together moved by -2.2 s. The group is 322.9 s, 10 % below its unchanged
     360 s projection (the run-to-run spread seen here is about 10 s: 332.2, 326.8 and 322.4 s).
   - **Other suites:** `mega` 11.0 to 15.4 s (+4.4 s, +40 %; +43 % in the first run; mega16 hell1 "4 puzzles are unique" 1.35
     to 3.74 s, mega12 nightmare 4.93 to 5.95 s), `multigrid` +2.9 s, `steps` +2.4 s and `replay` +2.4 s (pins for more jumps),
     `difficulty-floor` +1.8 s; `player` -8.0 s (the real top-level replay test), `worker` -2.0 s.
   - **E, same machine:** the 520 regression-hash requests got faster, 567.0 to 522.0 s (-45.0 s), the wires 76.0 to 71.3 s,
     the analyses 90.0 to 86.7 s (`shard-runs.jsonl` of both tasks).
   So the rise is the generation cost of the active policy on those fixed requests: slower for the quick Easy/Normal batches and
   for mega, faster over the 520 requests. Route: MS06d (it measures the 204 requests) and MS07e. Not a stop: the projection
   and the CI contract are not changed.
2. No new availability or correctness item; the inherited list is unchanged.

## 7. Deviations from the task file

1. The task's vector "a call to `localSearchSteps` with an initially exact 920 returns immediately" cannot be called: neither
   `localSearchSteps` nor `searchStrategy` is exported and an initially exact entry is unreachable through a production seam;
   no export was added. The stop is covered through `generate` (first-exact stop, keeper offers before the predicate).
2. A hell2 local-search tie test was dropped: Hell 2 has an empty tier, so every complete in-band rating is exact and a
   null-target tie cannot occur in a local search.
3. The REAL premise request of `pipeline.test.js` uses seed 5 instead of 1: seed 1 now rates 62 shallow positions and no
   longer meets the premise; seeds 3, 5 and 25 do (seed 5: `firstShallowAt` 27, 94 shallow ratings).
4. The announcement of the start of E to the orchestrator could not be made from this role; E ran only under the sudoku lock.
5. The old plateau move (equal quality, equal score) is no longer followed: specified by FS14 and MS06b's strict
   `preferRated`, not a deviation of this task's choosing.
6. Other specimens (exchanges from G07, synthetic 4x4 exchange, synthetic cause, the restored culprit on G07's exchange, see
   section 4 and 8). The four-part probe order no longer pins the total of 16 solver calls, only the first 14 in order.

## 8. Fix round after SA1's review (IR45-IR49)

- **IR45:** the refinement is described as specified and implemented: from an exact state in the band it goes on while above the
  finite target and keeps only exact, in-band reveals strictly nearer it (sections 2 and 3.1, `notes.md`).
- **IR46:** (a) G06 is a new puzzle too (3.3); (b) the two ledger identities (section 1); (c) the Greater-Than reason is that the sign
  dig ignores the target and its searches rate almost nothing (3.1); (d) the Killer Easy mechanism is `digKiller`'s guided pass
  (3.1); (e) the 17 empty transcripts are gone: the quick, T01 and the fix-round runs now have their transcripts, written by
  `tests/artifacts/difficulty-v3/MS06c2/tee-run.cjs` (the lock wrapper leaves the console of the command to the host, so
  a redirected pipeline had captured nothing); the probes of `pins/` are re-run for the live goldens; the temporary step and
  player probes and the preliminary run transcripts were not captured and are no longer referenced; the first replay-player
  run of the preliminary set had 58 passed and 11 failed (the `player` pins of the old G01, G04, G05, which the pin work then
  re-derived) and its second 69 of 69; (f) the manifest's `measuredSeconds` of `pipeline` is now the final run's 322.37 s
  (and replay 12.87, digger-target 1.18, player 132.26).
- **IR47:** section 6 item 1.
- **IR48:** the restored-culprit tests of `steps` and `player` use G07's exchange step, a move that really shows two clues
  again, with its transition made a jump whose culprit is one of them; the frames of the real jumps are taken away so that it
  is the only one. They assert that the culprit leaves `revealed` (and only it), that `dug` is unchanged and does not contain it,
  that `causeRestore` has it and `cause` is empty, the legend and the sentence, and the board frames. A mutation check
  (`fix-round/mutation-restored-culprit.txt`) makes both specimens the removed clue again: both tests fail (`steps` on the
  precondition that the culprit is a revealed clue, `player` on the expected revealed list).
- **IR49:** `explain.dig.how` (English and Vietnamese) says the pass looks for a removal whose solution *uses* a technique of the
  level ("dùng" in Vietnamese); the five new lines over 110 characters are rewrapped; `help.difficulty.guarantee.nightmare` says
  that after the score falls into the band the refinement goes on towards the target score for as long as the puzzle still
  reaches the level; the stale `design.md` row of stage B ("levels from `normal` up", IR51) says every level.
- **E:** `locale.*.js` and `help.js` are among the sources of the GR identity, so the 5 wires and 14 analyses were recorded
  again (71.2 s and 85.6 s, every shard exit 0); the content and the fixtures are unchanged (section 1).
- **Runs:** focused `steps,player,replay,help,ui-contract,i18n,events,result-view` 550 of 550 (`fix-round/focused-1.txt`); then the
  four Generator groups and the Player set (section 5) and the CI check on the final tree.
