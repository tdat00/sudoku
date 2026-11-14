# MS05r6a evidence: G13 saved, the final-source approved-contract recheck, the complete E and the coupled pins

Step evidence of the S-OD2 recovery (S-OD3 (d), S-OD4, CV6-03), not an acceptance; no commit of its own. Tree: `rating-v3`
at `1ae831c` plus the uncommitted retained recovery tree (MS05b1, r1-r4, r5p with its legacy-8 round, r5, r5m, b3) plus this
task's changes (`dirty` in the ledgers). Node v26.13.0, Windows x64, AMD EPYC 7763 (16 cores, 64 GiB), time factor 2.
Paths are relative to the repository root; commands run from `generator/` (the Player check from `player/`). Nothing here
changed an engine, a default, a guard, the task pack, a log or a reference.

## Identities

| Item | Value |
|---|---|
| Wire and analysis ledgers (`sourceHash`, 63 `SOURCE_FILES` and the four recorder files) | `c8601561a02f300cbf3fe333a5e63b84de44bc3feb96e6f410dfe1ff48d61e25`; the same in all 19 ledgers and in the current tree (the merges check it) |
| Wire manifest, analysis manifest | `c264da5e71fed9b0d740ffaacde4da0fa2cb71c699efcf8a5cfec61f861ed262` (5 requests G09-G13), `46c7ebd93dccd22c2d18bcb03a062ee3ee9f785b1b70f6b3013345e6c3fd2204` (14 requests) |
| Hash ledgers (`sourceHash`, engine files without UI plus `perf-helper.js`, `tool-records.js`, `perf.js`) | `a675f650873c0b267928f59e9ad6cfd24a1992e81eec24ece2109ce04d252d9f`, manifest `b022818aa3fb6736595d5280e80e9e3320e0fca83c1658e18ea8fcacef094304` (520 keys, as MS03d) |
| Engine `sourceHash` of the deep tool now / of the 14 records | `a073f9bdaac0a425d6e4af30643dab56d4c1ea2576aa151e79cc079f6be3cdb7` / `fee8b8d6d7a2c47f6f2c8628a0e940da72a8c3789448a7700ad787bc044025d0`; `toolHash` `2bff3a04d716af19d870b82cc1760b95fe011ec1b5117735a5678e25ac48fdd8` in both |
| Quick fingerprint of the focused results | Generator `00345dc1e924fc2cc3fe5657dff55ec53ba1080756033b2304cfb5e318f42347`, Player `6428ca5077dcb8bdc074c4491e4ae99e44cc274bae8ed983298d659eefa2dbda`, both confirmed unchanged at the end (`pins/fingerprint-final-generator.json`, `pins/fingerprint-final-player.json`); r5's were `dfc34b67…` and `0c9c78ce…` (the guides, `store.js`, the suites and the recorders changed since) |
| Published fixtures (SHA-256) | `replay-wire.js` `5A408610…` (was `91EA0FCE…`), `replay-goldens.js` `EBD635C0…` (was `6BDBCD03…`), `regression.js` `A9E1224C…` (was `2F86A25C…`) |
| Defaults in force | allowance 256 (`SHALLOW_SEARCH_DEFAULT`), attempts 8 up to 81 cells, 4 for 82-144, 2 above; no diagnostic override anywhere |

## Method and the shared-machine rule

Every command that generates a puzzle, or whose duration was not known to be under 10 s, ran under `Invoke-Dv3Node`
(`Invoke-Dv3Node.ps1`, the check-list helper, verbatim, 20-minute wait, 540-second limit) by way of `Run-Dv3Logged.ps1`
(one record of `runs.jsonl` per command: exit code, node seconds, wall seconds, lock wait) and, for several commands in
one lock turn, `Run-Batch.ps1` or the task's compound driver `generator/tests/artifacts/difficulty-v3/MS05r6a/run-shards.cjs`.
**Deviation to review:** Pentomino's MP12b1 alternated with every lock turn, so a lone command waited 3 to 5 minutes. The
104 hash shards, the last 7 analysis shards and the exact-selection runs were therefore grouped into compounds, each
**one locked Node invocation planned at 450 s or less (the driver projects the next shard as the larger of 60 s and twice
the slowest shard so far, and ends the compound otherwise), at most 540 s**, each shard still its own child process with
exactly the arguments of its E route (one `--hash-key`, five seeds, its own ledger, its own exit code and transcript:
`logs/<label>.txt`, `shard-runs.jsonl`). No shard was retried or replaced and no unlocked trial ran. Not locked, each a
no-generation command measured under 1 s (0.2-0.65 s; the two git-reading comparison scripts 10 s): the three `--list-tests`
listings, `--reconcile`, `--merge --check`, `--write`, `--hash-merge` and `--hash-list`, `mega-contract --reconcile`,
`snapshot-diff.cjs`, `fixture-diff.cjs`, `hash-summary.cjs`, `hash-classes.cjs` and the builders. The strict
publication checks are the existing E tools, whose refusal of a missing, duplicate, unknown or differently sourced record is
covered by `replay-recorders` (39 of 39) and `perf-tooling` (31 of 31) on synthetic ledgers; no new merge logic was written.

24 locked commands (22 in the first round, 2 in the fix round): 1,212.7 s of node time, 4,457.3 s of lock wait (longest 310 s,
none near the 20-minute limit), 5,670 s of wall time; 156 child commands of the compounds and sequences in `shard-runs.jsonl`
(141 and 15).

**IR12 (fix round).** The compound driver now accepts a `projectionSeconds` and a `projectionBasis` per plan item and admits an
item only when the elapsed time plus the larger of that projection and the generic floor (`--first-estimate`) fits 450 s; an item
whose own projection exceeds 450 s runs alone; each shard record keeps its projection and whether the shard stayed within it.
The first round's compounds ran with the generic projection (the larger of 60 s and twice the slowest shard so far: the
final `player` suite was admitted on 60 s and took 139.1 s, inside the budget); the fix round's 15 diagnostic requests ran
with their own projections (10-48 s, sum 218 s, actual 21.1 s, every item within its projection).

| Group | Locked commands | Result | Node s |
|---|---|---|---:|
| `a01` G13 120 s guard (r4's `g13-closure.cjs`, unchanged) | 1 | `ok` in 21.872 s of 120 s (18.2 %), 2 attempts, score 1,637, `exact` false, `difficulty.approximate` + `difficulty.shallow`, 106 clues | 22.4 |
| `b1` five wires G09-G13, one each | 5 | exit 0: 14.0, 25.8, 8.8, 4.9, 22.2 s | 75.6 |
| `b1` G13 branch test (3 suites, `--filter`, selected 3) | 1 | 3 of 3 passed, before B.2 | 0.4 |
| `b2` analyses G13, G01-G06 one each, G07-G14 in one compound | 8 | exit 0 (G13 22.2 s; the others 0.5-25.8 s; G14 1.8 s) | 90.1 |
| `b3` hash shards, two compounds (69 and 35 shards) | 2 | 104 ledgers, 520 keys once, exit 0 each; 0.5-55.5 s per shard (`diagonalX/nightmare` 33-55 s, `classic9/nightmare` 20-28 s), 560.0 s of shards | 560.3 |
| `c1` `steps`, `replay`, `player` before the pins (one compound, exit 1 expected) | 1 | 3 of 57, 6 of 153 and 3 of 69 failed; results kept | 161.4 |
| `c2` exploration of the pin data (`explore-pins.cjs`) | 1 | exit 0, 14 goldens and the guides' example, 11.0 s | 11.0 |
| `c3` 15 exact pin selections, 4 quick mega tests, `mega-contract`, the three suites again | 1 | exit 0 each of 23: every exact selection is one passed test; `steps` 57, `replay` 153, `player` 69 all passed | 227.9 |
| `d1` `replay-recorders`, `perf-tooling`, `help`+`ui-contract`, `store`+`controls`+`history`+`cache` (Generator) | 1 | 39, 31, 97, 251 passed | 35.4 |
| `d2` Player `help`+`ui-contract` | 1 | 89 of 89 passed | 1.4 |
| `e1` the player suite's 11 fixed results (IR11, `explore-player-fixed.cjs`) | 1 | exit 0: 0 reveal-fold steps, 11 requests in 5.6 s | 5.6 |
| `f2` the 15 diagnostic requests (IR10, `ir10-diagnostic.cjs`, one compound) | 1 | exit 0: 15 records outside E, 0.5-4.9 s each | 21.3 |

## A0: G13 persistence

`WIRE_IDS` of `generator/tests/fixtures/replay-recording.js` is `['G09', 'G10', 'G11', 'G12', 'G13']`; the recorder
headers (`replay-fixtures.js`, `replay-goldens.js`, `replay-recording.js`) and the text rendered into the two fixtures say
five and G09-G13. `suites/replay-recorders.test.js`: the pinned IDs and `REQUESTS.slice(8, 13)`; `--list` shows 5 records and
`G13 samurai nightmare 42`; `--help` says "generate the 5 requests"; the wire-file round trip builds five records; the
analysis projection test covers the five saved results; the refusal test now uses `G14` (an analysis ID that is no wire).
The branch test `reads G13 from the saved wire and never regenerates it (a spy on the pipeline)` is in `replay` (#25),
`steps` (#0) and `player` (#0): it empties the suite's cache for G13, replaces `SG.pipeline.run` with a thrower, asks for
the result, and compares `toPlainWire` of it with `SG.fixtures.replayWire.G13`. It failed (spy) with the old four-wire
fixture by construction and passed after B.1: `pins/g13-branch.json`, 3 of 3, run before the first analysis
(`b1-g13-branch-test`, in `runs.jsonl`). The recorder still generates G13 under `BUDGET_MS` 120,000.

## A: the approved-contract recheck (`preflight/compatibility.json`, four rows)

| Row | Prior evidence | Compatible | Action | Effective evidence |
|---|---|---|---|---|
| G13, 120 s guard | `MS05r4/preflight/G13.json` (8 attempts, source `9a833d93…`, 104.7 s) | no: the 369-cell default went from 8 to 2 attempts and the sources changed | rerun | `preflight/G13.json`: 21.872 s, 2 attempts (same request, script hash `eedeff26…`, machine, Node) |
| 14 deep mega records | `MS05r5m/records`, `reconciled.json` | yes, by the exact-diff proof below | retain | `MS05r5m/records` (14), reconciliation `preflight/mega-reconciled.json` |
| mega quick replacements (mega#96-#99) and `mega-contract` (37) | `MS05r5m/quick` at an older quick fingerprint | no (the fingerprint covers the guides, the UI and the suites) | rerun, `--exact`, fresh `--results` | `preflight/quick/mega-96.json` ... `mega-99.json` (1 of 1 each), `mega-contract.json` (37 of 37), listing `preflight/mega-selection.json` |
| b3's live CV3 mega12 and mega16 Nightmare cells | `MS05b3/cv3/cv3-mega16-nightmare.json`, `cv3-mega12-nightmare.json`, `mega-reconciled.json`, `mega-reconciled-after.json` | yes: manual outcomes of live generation, not deep records | retain (r6b C applies the same store-only proof, IR08) | the same files, untouched |

**IR04 deep-identity audit.** `preflight/mega-reconciled.json` (a fresh reconciliation, outside the records directory; exit
0): 14 requests and 14 records, complete, evidence sound, correctness pass, 6 relations pass / 0 fail / 0 unevaluated, no
problem; `identity.currentMatches` = `{ sourceHash: false, toolHash: true }`. `preflight/snapshot-diff.json` (script
`snapshot-diff.cjs`, read-only git): the producer snapshot `refs/dv3-wip/MS05r5m-done-20261114-0230` (`ad77fdf`, tree
`522e3d92…`) hashes, with its own `SOURCE_FILES` (63, the list unchanged), to the recorded `fee8b8d6…`; the working tree
hashes to `a073f9bd…`. Of the 949 snapshot files, 40 changed and 797 were added (`snapshot-diff.json`, taken last; the
evidence and documents of r5p's fix round, b3 and this task, the b3 manual-corpus files); the changed ones of the load set are
`generator/js/ui/store.js` (the only changed `SOURCE_FILES` entry: `preflight/diffs/generator__js__ui__store.js.patch` has
the same +/- lines as `MS05r5p/legacy-8-fix/store-diff.patch`) and `generator/tests/replay-fixtures.js` (comments and the
`HEADER` text of the wire fixture: `preflight/diffs/generator__tests__replay-fixtures.js.patch`). The tool files
(`tests/mega-contract.js`, `tests/fixtures/mega-contract.js`), `tests/fixtures/tool-records.js` (`withRequestedLevel`) and
`core/tests/node-evidence.js` are byte-identical, and `readSource`, `sourceList`, `loadFixtures`, `inside`, `gitState` and
`nodeEnv` of `replay-fixtures.js` are identical function for function. `store.js` defines `SG.store` and runs no code at
load; `storedAttempts` (the changed condition) is called only by the store's `load`; the deep tool builds its requests for
`SG.pipeline.run` directly and `SG.pipeline`, the engine, the variants and `core/js` do not mention `SG.store`. Nothing
that RNG, normalisation, generation, validation, recording or the relations execute changed, so the records are **retained
by exact-diff compatibility** (their digests, hashes and times untouched, the false match value kept). No MEGA-REFRESH.

## B: the complete E

**B.1 wires (G09-G13).** Five ledgers (`wire/`), merged: all 5 keys once from the current sources. Before the write the
check differed (exit 1, expected): G09-G12 by one field each (`work`, saved absent: MS05r3's work counts) and G13 "no saved
record". After `--write` (the fixture grows from 20 to 21 lines) the check is up to date for all five.
`diffs/wire-vs-head.json`: G09-G12 differ from HEAD only by `work`; G13 is new.

**B.2 analyses (G01-G14, G13 first, after B.1).** Fourteen ledgers (`analysis/`), merged: all 14 once. Before the write
(exit 1, expected): G06 (51 fields) and G07 (92) differed; G01-G05 and G08-G14 matched, **G13 and G14 included** (their
two-attempt regeneration gives the same puzzles). After `--write` the check is up to date for all 14
(`diffs/goldens-vs-head.json`: G06 54 leaf paths, G07 92). G06 (Jigsaw Nightmare 42): compact 7 steps, scores 0, 25, 44, 106,
1,697, 2,348, 2,348 (old 0, 25, 44, 49, 138, 1,678, 1,678), details 30 steps (33), one jump 106 to 1,697 by the clue R8C4.
G07 (Jigsaw Nightmare 3962167687): compact 9 steps, 0, 26, 44, 47, 511, 1,582, 1,589, 2,340, 2,340 (old 1,938), two jumps.
Both are required puzzles instead of the old shallow ones, the same change MS05b1 recorded (1,678 to 2,348 and 1,938 to
2,340), at allowance 256 as at none.

**B.3 hashes (520 keys).** 104 ledgers, 26 combinations by four five-seed shards; merged: all 520 keys once. Before the
update (exit 1, expected): 9 differ, `classic9/nightmare` seed 8, `diagonalX/nightmare` seeds 5 and 1597, `samurai/easy`
seeds 8, 610, 987 and 2584, `butterfly/normal` seeds 610 and 10946. After `--update-hashes` the check passes (all 520
unchanged). `diffs/hash-classes.json` (script `hash-classes.cjs`; MS04's fixture `6165c42` is the base, HEAD is MS05b1's
interim record, which the 104 ledgers of `MS05b1/hashes` equal key by key):

| Class of a key (520) | Keys | Meaning |
|---|---:|---|
| unchanged (now = interim = base) | 371 | never changed: exact before and after, or the first puzzle in the band kept as a shallow fallback |
| improved-kept (now = interim != base) | 140 | b1's improvement is found again at allowance 256 and the size defaults |
| improved-lost (now = base != interim) | 5 | the improvement is not found, the old puzzle comes back: `classic9/nightmare` 1, `diagonalX/nightmare` 1, `samurai/easy` 3 |
| other-puzzle (a third puzzle) | 4 | `diagonalX/nightmare` 1, `samurai/easy` 1, `butterfly/normal` 2 |
| new-change (interim = base, now different) | 0 | |

MS05b1's 56 shallow fallbacks (the same puzzle under both engines, `difficulty.approximate` and `difficulty.shallow` since
b1) are among the 371 unchanged keys: none of the 371 keys that b1 left alone changed ("new-change" 0). r4's mega16
attempt-6 diagnostic hit (seed 3, exact at attempt 6, 310.2 s) is knowingly unavailable at the new default (2 attempts for
256 cells, MS05r5p); it is no key of this corpus (`mega16/easy` is) and no E file depends on it (S-AV03).

**Attribution of the 9 changed keys (IR10, measured outside E).** The fix round generated 15 diagnostic requests, one process
each in one locked compound (`f2-compound-ir10`, 21.3 s; per-item projections 10-48 s, sum 218 s; every item within its
projection), with the route and the hash of `perf.js` (`ir10-diagnostic.cjs`): (i) the 9 keys with no allowance limit
(`SG.digger.SHALLOW_SEARCH_RATINGS = Infinity`) at the size default, and (ii) the 6 large keys at allowance 256 with an
explicit `maxAttempts` of 8. The records are in `diagnostic/` (kind `ir10-diagnostic`, refused by every E merge); no E ledger
or fixture was written. With the interim (no allowance, 8 attempts: MS05b1's ledgers) and now (256, size default: E), the four
corners are known for the large keys (`diagnostic/attribution.json`, script `ir10-attribute.cjs`; hashes are the first 8
digits, "att" the attempts that the diagnostic used):

| Key | Cells, size default | MS04 (base) | Interim (none, 8) | (i) none, size default | (ii) 256, 8 attempts | Now (256, size default) | Cause |
|---|---|---|---|---|---|---|---|
| `classic9/nightmare#8` | 81, 8 | `345c0e52` | `7c4a68aa` | `7c4a68aa` (att 7) | the same as now | `345c0e52` (base) | allowance only |
| `diagonalX/nightmare#5` | 81, 8 | `5b8f8f4f` | `223349ab` | `223349ab` (att 1) | the same as now | `5b8f8f4f` (base) | allowance only |
| `diagonalX/nightmare#1597` | 81, 8 | `12f1c008` | `14ba46aa` | `14ba46aa` (att 3) | the same as now | `d74675d9` (third) | allowance only |
| `samurai/easy#8` | 369, 2 | `7d341450` | `41ccc16c` | `41ccc16c` (att 1) | `f5518321` (att 3, exact) | `7d341450` (base) | allowance is necessary; the size default decides which result: at 8 attempts a third exact puzzle at attempt 3, at 2 attempts the old one |
| `samurai/easy#610` | 369, 2 | `12430060` | `232b9a6d` | `232b9a6d` (att 1) | `81bfcc4c` (att 2, exact) | `81bfcc4c` (third) | allowance only |
| `samurai/easy#987` | 369, 2 | `36644920` | `87f119da` | `87f119da` (att 1) | `46d7c348` (att 5, exact) | `36644920` (base) | allowance is necessary; the size default stops before attempt 5 |
| `samurai/easy#2584` | 369, 2 | `957046ee` | `08f20279` | `957046ee` (att 2, not exact) | `08f20279` (att 3, exact) | `957046ee` (base) | size default only (the interim puzzle is found at attempt 3) |
| `butterfly/normal#610` | 144, 4 | `477255b8` | `35c5769f` | `35c5769f` (att 1) | `4598f71f` (att 2, exact) | `4598f71f` (third) | allowance only |
| `butterfly/normal#10946` | 144, 4 | `b4764a9c` | `75b1f9cd` | `75b1f9cd` (att 1) | `e3122262` (att 2, exact) | `e3122262` (third) | allowance only |

So the cause of each changed key is measured: the allowance alone explains 6 (the 3 keys of at most 81 cells and
`samurai/easy#610`, `butterfly/normal#610`, `butterfly/normal#10946`), the size default alone 1 (`samurai/easy#2584`), and the
allowance needs the size default's cut to give the final puzzle in 2 (`samurai/easy#8` and `#987`: with 8 attempts the capped
search still finds a different exact puzzle at attempt 3 and 5). **Nothing else on the 81-cell keys:** for the three of them
the size default is 8, so (i) is the interim configuration, and it reproduces the interim hash exactly (full 16-digit
comparison) in 7, 1 and 3 attempts; the final hash is then the allowance's effect alone. This replaces the first round's
inference ("a share of the size default"): the measurement shows the large-board loss is mostly the allowance, with the size
default decisive for 3 of the 6 keys (2 mixed, 1 alone). The R5 guarantee is the hits of its six cells. All fixed keys and
seeds are kept; the published fixture differs from HEAD in 9 hashes (`diffs/hashes-vs-head.json`).

## C: the pins (`pins/resolved.json`, 13 entries)

The reviewed r4 manifest has `pins: []` and `returnedPremises: []` (its two blockers are the mega original-limit preflights,
answered by S-OD3/S-OD4), so no r4 entry needed repair. Owned files, recorded before the edits: `steps.test.js`,
`replay.test.js`, `player.test.js` and the guides' example sentences. The first complete runs (`pins/steps-run1.json`,
`replay-run1.json`, `player-run1.json`) failed 3, 6 and 3 tests, all of the G06/G07 data or the guides' example; the data
came from a fresh analysis of the final source (`pins/explore.json`, script `explore-pins.cjs`). Each entry has its original
request and requirement, the exact before and after, the reason and its `--exact` result (`pins/exact/`, one passed test
each); after them `steps` 57, `replay` 153 and `player` 69 pass in complete runs (`pins/*-run2.json`).

| Entry | Test | Change |
|---|---|---|
| P01, P05, P07, P13 | jump counts | compact 12 to 13, details 15 to 16 (G07 has two jumps now; 18 distinct stay), the `player` total 27 to 29 |
| P02 | the callout sentence per class | the `mixed` specimen moves from G07 (gone) to G09, position 37: "alone gives 524, versus 562 for the whole symmetric group" |
| P03, P09 | multi-move jump | the G06 row is removed (its jump is single-culprit now); G11 and G12 stay |
| P04 | same end position, jump in one view only | the G06 row is removed; the signed details change is asserted for G11 (-5) and G12 (-4) |
| P06 | new hardest technique at a flat or lower score | the G07 row is removed; G13 (flat) and G11 (fall) stay |
| P08 | a details jump framed | G06: position 27, 106 to 1,697, `single-culprit`, R8C4, other 107 (was position 29, 138 to 1,778, R4C6) |
| P10 | `UNRECORDED` table | the unused `G06:6` entry removed |
| P11 | the guides' example (`classic9` easy seed 3) | scores 0, 15, 26, 44, 46, 100, 100 and kinds with 3 random and 2 guided steps (old 0, 14, 24, 34, 44, 46, 46); `DEVELOPERGUIDE.md`, `.vn.md` and `generator/design.md` 7.5 say so |
| P12 | what a compact step folds | the reveal specimens G06 and G07 are gone, G11 stays (peak 1,967 now asserted); G12 plain peak and the no-fold checks stay |

Coverage report (S-OD4 and the task: report, never discard silently): the multi-move specimens went from 3 to 2 (G11, G12),
the "jump in one view only" from 3 to 2, the "new hardest at a flat or lower score" from 3 to 2 (one flat, one fall), the
reveal-fold specimens from 3 to 1. For P03, P04, P06 and P09 the `steps` and `replay` suites have no fixed results other
than the goldens, so no other existing example exists there. For P12 the search of the first round covered the 14 goldens
and the guides' example only; the fix round (IR11, `pins/explore-player-fixed.json`, one locked command, 5.6 s) searched
the `player` suite's 11 other fixed real results too, through `realResult`'s route (`classic9` normal 3, veryEasy 1,
nightmare 5; `classic4` veryEasy 2; `killer` easy 1, normal 2; `greaterThan` normal 4; `jigsaw9` easy 6; `wordoku` easy 1;
`mega12` easy 2; `mega16` veryEasy 1): **none carries a `replay.folded.reveal` step** (only `greaterThan` normal 4 folds, three
plain peaks 127, 149 and 287; no result has a multi-move jump, a view-dependent jump or a new hardest technique at a flat or
lower score). So the searched scope for the reveal fold is "the 14 goldens, the guides' example and the player suite's 11
other fixed real results; none", and G11 stays its single specimen: the named **coverage item MS05r6a-COV01 for MS18e** (if
G11 changes the test fails loudly, because its row and peak are asserted by name; a synthetic, non-generating test of the
fold rendering would protect the branch independently of the goldens, and is not part of this task: no new golden, wire or
request). Every behaviour stays asserted by a golden that has it; none was weakened to a permissive check.

## Documents changed

`DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md` (five saved goldens G09-G13; the guides' example), `generator/design.md`
(five slow goldens in the layout, 15.2 and the scripts; 7.5: the example and the view-dependent transition now cites G11),
`docs/difficulty-v3/notes.md`. No other document, no Player file, no `docs/puzzle-exchange` text changed.

## Items (S-OD4)

No correctness failure. Numbered items, with the numbers of this task where it adds any (routes: MS07e, then MS18c for
availability and MS18d for cost; MS18e audits):

| Item | State after this task |
|---|---|
| S-AV01 Greater-Than Normal CV6 | carried: 2,035 ms p95 against 1,400 ms (pause); b3's Normal I5 p95 5,280 ms; this task adds nothing |
| S-AV02 mega12 Nightmare | the 7 deep records retained: 23.520-25.243 s (median 23.723 s), 0 of 7 exact, 7 shallow fallbacks; b3 live CV3 0 of 3 (23.5, 23.1, 22.8 s); the one-attempt quick request mega#96 took 5.58 s |
| S-AV03 mega16 Nightmare | retained: 80.394-116.951 s, 7 of 7 over the 30 s p95, 0 of 7 exact; b3 live CV3 0 of 2 (116.8, 103.9 s) |
| S-AV04 samurai Nightmare (G13) | now 21.872 s of the 120 s guard (18.2 %), 2 attempts, shallow fallback (score 1,637); recorded as a wire in 22.2 s; b3 0 of 2 (26.7, 25.2 s); r4's 104.7 s at 8 attempts is historical |
| S-AV05 Killer Hard, S-AV06 Killer Expert | carried: 0 of 20 I5 and 0 of 3 CV3; 1 of 8 and 0 of 3 (b3); no new data |
| S-AV07 classic9 Nightmare | carried (2 of 12 exact); in the E keys `classic9/nightmare` has 14 unchanged, 5 improved-kept, 1 lost (`#8`: the allowance alone, measured) |
| S-AV08 standing quick cost | partial data for MS05r6b: `steps` 11.5 s, `replay` 11.1 s, `player` 139.1 s (the one slow Generator shard so far), `mega-contract` 2.0 s, `replay-recorders` 8.0 s, `perf-tooling` 11.6 s; not a complete measurement |
| S-AV09 to S-AV13 | carried from b3 (Killer Master/Nightmare I5, Wordoku I5, jigsaw9 Expert 325.3 s request, sohei/butterfly/flower Nightmare, butterfly/flower Easy); no new data |
| New numbers, no new S-AV item | the final allowance and size defaults reproduce 140 of b1's 149 improved hashes (3 of 106 lost on boards of at most 81 cells, 6 of 43 on large boards), each of the 9 changed keys attributed by measurement (the allowance alone 6, the size default alone 1, the allowance with the size default's cut 2): explained above, not an availability failure |
| MS05r6a-COV01 (coverage item, owner MS18e) | the `replay.folded.reveal` branch of the `player` test has one specimen, G11 compact step 2 (position 108, peak 1,967, 10 clues restored); the 14 goldens, the guides' example and the player suite's 11 other fixed real results were searched, none carries another; the other reductions (P03, P04, P06, P09) keep two specimens each, and the `steps` and `replay` suites have no fixed results besides the goldens |

## Handoff to MS05r6b

- Publication state: the three fixtures and 13 pins above are final for this source; the E ledgers are valid only while the
  hashed sources stay as they are (`c8601561…`, `a675f650…`): a later change of an engine, UI or recorder file needs fresh
  ledgers (a guide, a design file or a test suite does not, but it changes the quick fingerprint).
- Compatibility: `preflight/compatibility.json` and the proof files in `preflight/` (`snapshot-diff.json`, `diffs/`); r6b B1
  revalidates the proof on the final tree, applies the same store-only proof to the 186 manual results (IR08), and carries the
  IR07 labels (the `slot: none` timings of b3 stay unprotected descriptions).
- Quick: the Generator `steps`, `replay`, `player` suites (57, 153, 69) and `replay-recorders` (39) pass at `00345dc1…`; the
  inventory changed by the three new tests (`pins/replay-inventory-final.json`, 279 tests in the three suites).
- Fix round (IR10-IR12): no hashed file, test suite, guide or design changed (IR11 found no second specimen, so `player.test.js` is untouched); the quick fingerprints stay `00345dc1…` and `6428ca50…` (listed again at the end of the round: `pins/fingerprint-fixround-generator.json` and `pins/fingerprint-fixround-player.json`, equal to the `-final-` ones).
- Coverage: P03, P04, P06, P09 and P12 and the named item MS05r6a-COV01 go into r6b's combined audit (T03) and on to MS18e.
- Obligations left: the full quick sets, GD, the standing cost, the combined audit; no GH, GP or deep run was needed.
