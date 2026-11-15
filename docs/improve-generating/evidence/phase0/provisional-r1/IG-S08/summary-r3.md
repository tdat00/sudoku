# IG-S08: bounded SM3 attribution of Jigsaw Expert seed 1111 (provisional-r1, r3 (pack-author review, reporting only): F1 labels cumulative versus open-stage full-grid figures and completed versus active searches (the fullGrid row and the 238.78 s, 84,717,442 nodes and 176,221,059 backtracks span all four full-grid stage entries, not attempt 4 alone; grid searches, restarts and backtracks count completed searches only, the running search is in none of them; per-attempt counts stay unknown); F2 says solver-check totals were not instrumented instead of claiming the request had no budget (the digger has internal budgets); F3 removes the unconditional application and native-speed claims. Reporting code only: the two commands ran under harness fe2bae1efce6, the r2 documents were written by acd724186e2d and the r3 documents by 82b623923934; r1 and r2 and every record, journal and command file are kept as written (they contain the earlier wording).)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default. Pre-MS07: the catalogue, floors and search may change when difficulty-v3 freezes.**

**pre-MS07: the catalogue, floors and search may change when difficulty-v3 freezes (MS07); every number here is provisional (pre-freeze) and a frozen rerun with the same seeds and bound is the confirmatory one.**

Formal gate: **not-evaluable-pre-freeze (a diagnostic task, not a latency gate)**. Evidence status: **provisional (pre-freeze)**.

Provenance: harness base 5027a528f03a (IG-S07 r2 writer; this task adds files and one line each to run.cjs and worker.cjs, so the harness fingerprint of its commands differs and is recorded in each command.json); loop-test 062742c330eb (the IG-S07 loop-check command: the budget-check counts of the logical solver loop). Counter limitation: chain propagation checks that bypass ctx.check are not counted (IG-S07 limitation carried forward); the totals of the solver's budget checks were not instrumented in this task (the request passes no external budget, but the digger's own internal budgets issue checks that are not counted), so they are recorded as unknown, never zero.

## Result

| item | value |
|---|---|
| request | jigsaw9, Expert, seed 1111, trace off, rotational180, random order, default options and attempts |
| historical total (I5) | 325.313 s: a separate, uninstrumented historical measurement whose machine and source version are not re-established here; the request was not retained and is not remeasured to completion (a 400 s command would break the 300 s ceiling); the other 19 requests took at most 2.438 s |
| this run: outcome | request-timeout (CENSORED: a lower bound) |
| this run: completed latency (cold wall) | none: the request did not complete |
| this run: censored wall lower bound | >= 240.01 s |
| this run: CPU lower bound (host process, to the timeout) | >= 238.55 s (resolved) |
| limit actually applied | 240.00 s from the request start, scope request (guard 240.00 s, jigsaw; command deadline 265.02 s; command window at spawn 256.34 s) |
| worker startup (not in the attribution) | 0.14 s |
| puzzle / exactness | none: nothing is invented for a censored request |

censored lower bound at the limit actually applied: not a completed latency, not a pass, not evidence that a specific S7 ceiling is safe.

## Attribution of the tail by stage (lower bounds)

Source of the attribution: **final** (marker/shared-memory agreement: agree; matches the record: true). Observed by the beacon: 239.88 s; unobserved (worker startup and engine load): 0.14 s.

| stage | wall lower bound | share | dfs nodes (live) | dfs checks (live) | dfs backtracks (live) | completed grid searches | completed grid restarts | grid backtracks of returned searches |
|---|---|---|---|---|---|---|---|---|
| outside | 0.01 s | 0.0 % | 0 | 0 | 0 | 0 | 0 | 0 |
| configure | 0.00 s | 0.0 % | 0 | 0 | 0 | 0 | 0 | 0 |
| buildModel | 0.04 s | 0.0 % | 7255 | 7253 | 13444 | 27 | 26 | 5252 |
| fullGrid | 238.78 s | 99.5 % | 84717442 | 84717439 | 176221059 | 111 | 108 | 440433 |
| extraStructure | 0.00 s | 0.0 % | 0 | 0 | 0 | 0 | 0 | 0 |
| dig | 0.27 s | 0.1 % | 800 | 753 | 1511 | 0 | 0 | 0 |
| rate | 0.01 s | 0.0 % | 0 | 0 | 0 | 0 | 0 | 0 |
| tune | 0.00 s | 0.0 % | 0 | 0 | 0 | 0 | 0 | 0 |
| local | 0.77 s | 0.3 % | 13173 | 12016 | 19121 | 0 | 0 | 0 |

Counter scope: every row is cumulative over the whole request, so the fullGrid row spans every full-grid stage entry (finished and open), not the open attempt alone; the grid columns count COMPLETED searches (a search is booked when it returns, so a running search is in none of them); the dfs columns are LIVE and include a running search. Per-attempt counts are unknown.

Full-grid scope (cumulative versus the open stage, completed versus active searches):

| scope | wall | completed searches | completed restarts | backtracks of returned searches | live dfs nodes | live dfs backtracks |
|---|---|---|---|---|---|---|
| cumulative: all 4 full-grid stage entries (3 finished, 1 open) | 238.78 s | 111 | 108 | 440433 | 84717442 | 176221059 |
| finished stage entries (3; the longest 0.20 s) | 0.32 s | unknown | unknown | unknown | unknown | unknown |
| open stage entry (attempt 4) | >= 238.46 s | unknown (1 active) | unknown | unknown | unknown | unknown |

Unlimited last search marker: context fullGrid, search index 50 of its generate call, entered 0.27 s after the open stage opened, running for at least 238.18 s.

Completed searches (all contexts (the layout solvability check's searches included)) stayed at 138 from heartbeat no. 1 (5.01 s) to the end. unknown: the counters are cumulative per context and no snapshot is taken at a stage entry; for the open stage only its wall time, the unlimited-entry marker and the heartbeat observation above were recorded.

Top contexts (exclusive wall; the sub-columns separate the finder, solver, rating, depth-first and grid-generator parts):

| context | stage | wall | entries | largest part |
|---|---|---|---|---|
| fullGrid | fullGrid | 238.78 s | 4 | dfs 238.78 s |
| local.rating | local | 0.36 s | 469 | finder forcingChain 0.14 s |
| local | local | 0.34 s | 3 | own 0.34 s |
| dig.objective(stageB) | dig | 0.22 s | 2905 | solver 0.07 s |
| local.unique | local | 0.07 s | 725 | dfs 0.07 s |
| dig.oracle(stageA) | dig | 0.03 s | 797 | solver 0.01 s |
| dig | dig | 0.02 s | 36 | own 0.02 s |
| layout.solvable | buildModel | 0.02 s | 1 | dfs 0.01 s |
| layout.plain | buildModel | 0.01 s | 1 | dfs 0.01 s |
| rate | rate | 0.01 s | 39 | solver 0.00 s |

Finder families (time, calls, hits; all stages):

| family | wall | calls | hits |
|---|---|---|---|
| chain | 0.15 s | 811 | 573 |
| fish | 0.12 s | 7168 | 1661 |
| basic | 0.10 s | 264921 | 185818 |
| subset | 0.08 s | 17416 | 936 |
| locked | 0.03 s | 20942 | 10813 |
| wing | 0.02 s | 3141 | 94 |

Non-finder wall by kind (ms): {"solver":102.408447,"rating":3.643554,"dfs":238880.3361819375,"gridGenerator":1.965088,"own":389.577881}.

Stage sequence from the markers (126 stage entries, the last 12 below; finished stages by step: {"configure":{"count":1,"wallMs":0.388916,"maxWallMs":0.388916},"buildModel":{"count":1,"wallMs":37.738281,"maxWallMs":37.738281},"fullGrid":{"count":3,"wallMs":320.91625999999997,"maxWallMs":195.973145},"extraStructure":{"count":3,"wallMs":0.203857,"maxWallMs":0.146484},"dig":{"count":39,"wallMs":1045.052247,"maxWallMs":340.208252},"rate":{"count":39,"wallMs":11.164796000000004,"maxWallMs":0.697266},"tune":{"count":39,"wallMs":0.4782720000000001,"maxWallMs":0.072021}}):

| step | attempt | sample | kind | wall | finished |
|---|---|---|---|---|---|
| rate | 3 | 10 | ordinary | 0.00 s | true |
| tune | 3 | 10 | ordinary | 0.00 s | true |
| dig | 3 | 11 | ordinary | 0.01 s | true |
| rate | 3 | 11 | ordinary | 0.00 s | true |
| tune | 3 | 11 | ordinary | 0.00 s | true |
| dig | 3 | 12 | ordinary | 0.01 s | true |
| rate | 3 | 12 | ordinary | 0.00 s | true |
| tune | 3 | 12 | ordinary | 0.00 s | true |
| dig | 3 | 12 | local | 0.21 s | true |
| rate | 3 | 12 | local | 0.00 s | true |
| tune | 3 | 12 | local | 0.00 s | true |
| fullGrid | 4 | n/a | n/a | running at the end | false |

Heartbeat samples (the host reads the shared memory every 5.00 s; 47 reads; where the request was at each tick, counted): [{"where":"fullGrid / dfs","heartbeats":47}].

| at | cpu | context / part | step | attempt | sample | dfs nodes (live, cumulative) | dfs backtracks (live, cumulative) | completed grid searches (all contexts) | completed grid restarts (all contexts) | layout attempts | finder calls |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 5.01 s | 5.58 s | fullGrid / dfs | fullGrid | 4 | n/a | 1369280 | 2865339 | 138 | 134 | 1 | 314399 |
| 15.02 s | 15.31 s | fullGrid / dfs | fullGrid | 4 | n/a | 4868383 | 10155900 | 138 | 134 | 1 | 314399 |
| 25.04 s | 25.27 s | fullGrid / dfs | fullGrid | 4 | n/a | 8364741 | 17441449 | 138 | 134 | 1 | 314399 |
| 35.04 s | 35.20 s | fullGrid / dfs | fullGrid | 4 | n/a | 11965460 | 24967860 | 138 | 134 | 1 | 314399 |
| 45.05 s | 45.17 s | fullGrid / dfs | fullGrid | 4 | n/a | 15630657 | 32573841 | 138 | 134 | 1 | 314399 |
| 55.06 s | 55.16 s | fullGrid / dfs | fullGrid | 4 | n/a | 19176701 | 39990615 | 138 | 134 | 1 | 314399 |
| 65.06 s | 65.13 s | fullGrid / dfs | fullGrid | 4 | n/a | 22735417 | 47468273 | 138 | 134 | 1 | 314399 |
| 75.07 s | 75.05 s | fullGrid / dfs | fullGrid | 4 | n/a | 26332079 | 54945114 | 138 | 134 | 1 | 314399 |
| 85.08 s | 84.95 s | fullGrid / dfs | fullGrid | 4 | n/a | 29893148 | 62350202 | 138 | 134 | 1 | 314399 |
| 95.09 s | 94.86 s | fullGrid / dfs | fullGrid | 4 | n/a | 33508789 | 69871607 | 138 | 134 | 1 | 314399 |
| 105.11 s | 104.80 s | fullGrid / dfs | fullGrid | 4 | n/a | 37153350 | 77487363 | 138 | 134 | 1 | 314399 |
| 115.11 s | 114.78 s | fullGrid / dfs | fullGrid | 4 | n/a | 40740795 | 84911812 | 138 | 134 | 1 | 314399 |
| 125.11 s | 124.69 s | fullGrid / dfs | fullGrid | 4 | n/a | 44402118 | 92541564 | 138 | 134 | 1 | 314399 |
| 135.11 s | 134.72 s | fullGrid / dfs | fullGrid | 4 | n/a | 48067503 | 100170216 | 138 | 134 | 1 | 314399 |
| 145.12 s | 144.69 s | fullGrid / dfs | fullGrid | 4 | n/a | 51676713 | 107611058 | 138 | 134 | 1 | 314399 |
| 155.12 s | 154.69 s | fullGrid / dfs | fullGrid | 4 | n/a | 55253963 | 115047584 | 138 | 134 | 1 | 314399 |
| 165.13 s | 164.59 s | fullGrid / dfs | fullGrid | 4 | n/a | 58974139 | 122790509 | 138 | 134 | 1 | 314399 |
| 175.13 s | 174.53 s | fullGrid / dfs | fullGrid | 4 | n/a | 62537569 | 130178090 | 138 | 134 | 1 | 314399 |
| 185.13 s | 184.52 s | fullGrid / dfs | fullGrid | 4 | n/a | 66263461 | 137899005 | 138 | 134 | 1 | 314399 |
| 195.14 s | 194.45 s | fullGrid / dfs | fullGrid | 4 | n/a | 69881880 | 145401923 | 138 | 134 | 1 | 314399 |
| 205.14 s | 204.42 s | fullGrid / dfs | fullGrid | 4 | n/a | 73437416 | 152766624 | 138 | 134 | 1 | 314399 |
| 215.15 s | 214.42 s | fullGrid / dfs | fullGrid | 4 | n/a | 77058905 | 160282385 | 138 | 134 | 1 | 314399 |
| 225.17 s | 223.80 s | fullGrid / dfs | fullGrid | 4 | n/a | 79622715 | 165623086 | 138 | 134 | 1 | 314399 |
| 235.18 s | 233.70 s | fullGrid / dfs | fullGrid | 4 | n/a | 83044789 | 172740435 | 138 | 134 | 1 | 314399 |

## Counters

Layout: {"layoutAttempts":1,"layoutGrowthBacktracks":6,"layoutLevels":78,"layoutFeasibility":273,"layoutUnsolvable":0,"layoutHard":0,"layoutAccepted":1,"gridUnlimitedEntered":1,"samples":39}.

Depth-first and grid totals over the whole request (the dfs figures are live, the grid figures count completed searches only): {"dfsNodes":84738670,"dfsChecks":84737461,"dfsBacktracks":176255135,"gridSearches":138,"gridRestarts":134,"gridBacktracks":445685}.

Instrumentation overhead estimate for the tail: 325098 spans, 345731538 counter increments and 333 markers are about 2396.966 ms (1.0 % of the observed wall). calibrated unit costs (a micro-benchmark of the control command: 207 ns per span, 6.7 ns per counter increment, the marker post without the thread hand-over) times the operations counted in the tail; the real cost of a call inside a hot loop can differ, and the tail's uninstrumented throughput was not measured, so the depth-first counts are counts of the instrumented search only. An estimate, never a correction.

Unknown (never zero):

- solverBudgetChecks: not instrumented: the totals of the solver's budget checks are not counted (the request passes no external budget, but the digger's internal budgets, such as the stage B objective step guard and the uniqueness-count node slices, issue checks); the propagation checks of the chain finders bypass ctx.check in any case (IG-S07 limitation)
- constraintPropagationOperations: no counter exists in the private source; the time is part of the cell of the caller (the logical solver's own code, a finder or the depth-first search)
- findingApplicationTime: part of the logical solver's own code (sub solver), not separated from the ladder loop
- perCallTimeOfOracleObjectiveKeeperLocal: wall time and call counts are kept per context, not per individual call

## Reading

- Dominant stage by wall lower bound: fullGrid (238.78 s, 99.5 % of the 239.88 s observed from engine start of the request).
- Dominant context: fullGrid (238.78 s); largest part inside it: dfs 238.78 s.
- When the observation ended the request was in fullGrid / fullGrid (pipeline step fullGrid, attempt 4), inside the dfs, for at least 238.18 s since its last accounted segment.
- Before the stage that was still open, 125 stage entries ran to the end and took 1.42 s in total; the 3 finished full-grid stage(s) took 0.32 s in total, the longest 0.20 s.
- Layout (buildModel): 1 growth attempt(s), 6 growth backtrack(s), 78 open level(s), 273 feasibility call(s); 0 dropped as unsolvable, 0 as too hard for the plain search; a layout was accepted.
- Full-grid counters, cumulative over all 4 full-grid stage entries (3 finished, 1 open): wall lower bound 238.78 s; COMPLETED searches 111 (108 restarts, 440433 backtracks of returned searches; the running search is in none of these three); LIVE depth-first counters, which include the running search: 84717442 nodes, 176221059 backtracks. Per-attempt counts are unknown.
- Open full-grid stage (attempt 4) alone: wall observed >= 238.46 s (stage-open marker to the host's timeout instant); the 3 finished full-grid stage(s) account for 0.32 s of the cumulative wall. Its unlimited last search was entered 0.27 s after the stage opened (marker: search index 50 of its generate call) and was still running, for at least 238.18 s.
- Completed searches (all contexts: the layout solvability check's searches included) stayed at 138 from the heartbeat at 5.01 s (no. 1) to the end of the observation.
- Largest finder family by time: chain (0.15 s, 811 calls, 573 hits); all finders 0.50 s of 239.88 s.
- Heartbeats: counters still moving in the last heartbeat interval.

## What it implies for S7 and the ceilings

- Context fullGrid points at the full-grid search (generate: unlimited last search after the 50th restart; restarts keep forking `grid#a.k`): the ceiling on total restarts or work of IG-S-Q07 option (b).
- What this one request offers for sizing a count-based full-grid ceiling, with its scope: 3 finished full-grid stage(s) took 0.32 s in total (the longest 0.20 s); the open stage alone was observed for at least 238.46 s, its unlimited last search for at least 238.18 s; the depth-first counts (84717442 nodes, 176221059 backtracks) are cumulative over ALL 4 full-grid stage entries and come from the instrumented search, and 111 searches had COMPLETED (the running one is not counted); no per-attempt node, backtrack or restart count exists. A single request gives no distribution per successful full-grid attempt, so no ceiling can be sized from it.
- The instrumented observation ran past 120 s without finishing. That does not establish this source's uninstrumented latency: the observation's overhead was measured once, on a different request (seed 1100, n = 1), and estimated from a micro-benchmark, and the tail's uninstrumented throughput was not measured. The historical uninstrumented 325.313 s (I5) is a separate risk statement, not re-established here. What either implies for the application's 120 s guard is not decided by this run.
- The request was censored at 240.00 s (request): this is a lower bound. It does not show how long the request takes, that the observed stage is the only expensive one, or that any particular S7 ceiling is safe or sufficient.
- No ceiling is chosen or tested here. A ceiling and its reaction need the separately designed experiment the task file names, after the frozen catalogue (MS07).

## Control (Jigsaw Expert seed 1100)

Command status complete; identity of the observed request against the native one: 1 identical, 0 different, 0 not comparable.

| arm | outcome | ready wall | cold wall | cpu | puzzle hash | verified exact | validation |
|---|---|---|---|---|---|---|---|
| native (unobserved) | complete | 0.51 s | 0.61 s | 0.98 s | 6b2c35d92da1ce29fee1b6bb917a8a6a095c4d886924e993fe0a4ddf65028423 | true | verified |
| observed (beacon) | complete | 0.59 s | 0.72 s | 1.11 s | 6b2c35d92da1ce29fee1b6bb917a8a6a095c4d886924e993fe0a4ddf65028423 | true | verified |

Instrumentation overhead on seed 1100 (n = 1): ready-wall factor 1.159, cold-wall factor 1.181, CPU factor 1.127. one pair of requests, time-separated: a single ratio, not a distribution; the profiled request is an attribution run, never a timing run Operation-count estimate: 230594 spans, 15255 counter increments, 268 markers = about 47.789 ms (8.1 % of the observed wall).

Engine checks of the instrument (real engine, first command): 28/28 passed.

Synthetic short-timeout journal recovery test (busy worker, test-only host, guard 1.50 s): 15/15 checks passed.

## Machine time

| command | attempt | occupied | charged (occupied + 45 s grace) | priority wait (not charged) | status |
|---|---|---|---|---|---|
| control | a1 | 4.98 s | 49.98 s | 45.21 s | complete |
| tail | a1 | 241.42 s | 286.42 s | 45.13 s | complete |

Charged 336.39 s of the 360.00 s allocation (approved extra 0.00 s); remaining 23.61 s; priority waits 90.35 s.

## Acceptance criteria

| id | status | evidence |
|---|---|---|
| B01 | met | the tail is attributed to observed stages (see the table); source final |
| B02 | met | the request is recorded as a censored lower bound; summary.md and tail-attribution.json say it is not a pass, not a completed latency and not evidence for a specific ceiling |
| B03 | met | every command ran through the supplied low-priority wrapper (exit 0, at most 300 s); the production/test firewall was clean: true; priority waits are excluded from the charge |
| T01 | met | the synthetic busy-worker recovery test and the real journal (markers 333, heartbeats 47, source final) |
| T02 | met | control digests: 1 identical, 0 different; no production restart, guard or RNG change (patched sources are private in-memory copies; hooks draw nothing) |
| T03 | met | timeout: no puzzle, no check result was invented (puzzle hash null, exactness null) |
| T04 | met | wall, CPU and counter lower bounds, the source identities and the unknown counters are listed in tail-attribution.json |

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| harness fingerprint (this task's commands) | fe2bae1efce6bf8df07ff7020a0ca422c10e9b4d3579378387cc6cc2ae743fce |
| adapters | jigsaw-profile |
| adapter hashes | 69890fe8acaef852f6c19acb10985041a335e8ac55e3f6551bca1b4f6b6e2c62 |
| sources stable | true |
| firewall clean | true |
| node | v26.13.0 |
| platform | win32 10.0.26300 x64 |
| cpu | AMD EPYC 7763 64-Core Processor (16 logical processors) |

## Deviations and disclosures

- Harness edits beyond new files: run.cjs registers the IG-S08 task glue and passes attemptDir to prepare and execute (the stage journal lives beside the other evidence of the attempt); worker.cjs gets one dispatch line for the job kinds ig08-. No production code, test, golden or difficulty-v3 document was changed.
- Development ran unwrapped, as the harness README allows for pure work: the pure cases of ig08-test.cjs (32/32 after the review) and ig07-test.cjs (31/31) (no engine, no worker thread; the fake-worker recorder cases wait about two seconds of idle timers), a source-only dry run of the 32 transforms, the dispatcher plan-only and the evidence-only aggregator. Every engine, worker-thread and generation run (the engine checks, the calibration, the synthetic recovery test and the three requests) went through the dispatcher and the supplied wrapper.
- No wrapped dev-check, no rerun and no retry: two wrapped commands (control a1, tail a1), recorded in ledger.json; no approval was requested or used; the review fixes ran no engine and no measurement.
- The tail guard of 240 s was the binding limit (the command window left 256 s at spawn): the request is a censored lower bound at 240 s, not a command-scope cut.
- The beacon header keeps attempt, sample and kind of the previous sample until the next stage of that kind opens, so the raw journal, records and the r1 documents show a stale sample and kind for a full-grid entry; the r2 and r3 documents suppress them for steps that are not part of a sample.
- Depth-first counts are counts of the instrumented search: the observation overhead was calibrated (a micro-benchmark), estimated from the counted operations and measured once on seed 1100 (n = 1); the tail uninstrumented throughput was not measured.
- Wording corrected in r3 and left as written in the immutable evidence: the records, command.json notes, summary files and the r1/r2 documents say that the request has no budget so ctx.check is a no-op (r3: solver-check totals were not instrumented; the digger has internal budgets, for example the stage B objective step guard and the uniqueness-count node slices; the guards are unchanged), attribute the cumulative full-grid counters to the open stage, and (r2) state that the application would end the request by its 120 s guard and that the native search is faster per node.
