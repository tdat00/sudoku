# IG-S09 Greater-Than miss predicate and solve-first diagnostic (provisional, pre-freeze; pre-MS07)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Pre-MS07: the catalogue, floors and search may change when difficulty-v3 freezes. Every figure is an instrumented diagnostic (trace summary, capture hooks); none is an uninstrumented headline.

## Revision r2: corrections after the pack-author review (r1 files are preserved unchanged)

summary.json (r1, preserved unchanged): the same recorded evidence, with the r2 corrections listed in r2Corrections.

- **IG-S09-ASTRA-F1** (counter units and timing labels). Code: new records no longer alias countSolutions calls to counts.dfsEntries (it stays null: node entries are not instrumented); each record carries gt.counterUnits. Report: dfsCalls are countSolutions CALLS, dfsChecks are search-loop budget checks, UNIQUE_NODES counts budget checks (search-loop and propagation); CPU columns are the request total CPU (startup and cleanup included); the blanket "p95 is the observed maximum" is replaced (the maximum for n < 20, the second-largest at n = 20); the r1 records are annotated (counterInterpretation), not rewritten.
- **IG-S09-ASTRA-F2** (failures are preserved and guards identified by evidence). Code: a solver exception, contradiction, uniqueness-assuming proof or malformed report stops the G1 request (no retry through the native order) and the first failure keeps its code, site and ordinal; guard-binding-difference needs a recognised recorded guard code, otherwise mismatch; an unrecognised failure stops the diagnostic request. Report: failures block; T01 is never "met" with a recorded stop; the recorded r1 results had 0 fallbacks and need no rerun.
- **IG-S09-ASTRA-F3** (the diagnosis deadline). Code: the allowance is 30 s from the diagnosis start (DIAG_GRACE_MS removed), bounded by the command deadline, with a margin inside it; the worker reports each piece of work before it starts, so unfinished (started, unknown) and unstarted (never reported) are kept apart and arrived rows survive a timeout. Report: diagnosisDeadline block (with the longest recorded diagnosis wall); samples.json shows unfinished / unstarted per sample; the r1 results stand where every recorded diagnosis is inside the 30 s allowance (see diagnosisDeadline.reading).
- **IG-S09-ASTRA-F4** (executed probes versus reused coverage). Code: none (the records already carry reusedFrom). Report: setup-probes-r2.json and the Setup probes section list the executed group checks and the reused copies apart, with donor and recipient request counts; the results are split the same way and a reused copy is never counted as an independent execution.
- **IG-S09-ASTRA-F5** (wait provenance). Code: the development check takes the caller's --requested-at and writes a null wait without it (never a fictitious 0). Report: machine.priorityWait: the ledger-recorded waits of the shard / control commands are a known partial figure, not an all-task total; the development check's wait is unknown; the charge is reconciled with the common budget reader (the development check is charged once).

## Coverage

- Experimental pairs: Normal 20 of 20, Nightmare 6 of 10 (recorded and completed; **partial, budget-limited**). Requests recorded 52, completed 52, censored or failed 0, unstarted 8 of the 60 planned request rows (Nightmare seeds 706, 707, 708, 709: **unstarted**, not excluded, failed or replaced; the pack author ruled that they are not finished in this pre-freeze round).
- Observer-free controls (a separate population): 2 of 2 recorded.
- Population: Greater-Than Normal, literal seeds 300-319 (20 paired requests); Greater-Than Nightmare, literal seeds 700-709 (10 paired requests). trace SUMMARY (the historical diagnostic population), other options and defaults native; arm order alternates by seed index.

Direction of every comparison below: **G0 / G1** (a value below 1 means G1 took longer). Ratios of cohort totals and paired summaries (medians of per-pair ratios) are labelled apart.

## G0 / G1 identity and parity (order-parity.json)

Pairs: {"total":26,"identityOk":26,"guardBindingDifference":0,"mismatch":0,"notComparable":0,"deferred":0}. Controls (observer-free native against the captured G0): control:greaterThan:normal:300 identity-ok; control:greaterThan:nightmare:700 identity-ok.

## Physical work (cumulative over the completed requests; per-pass figures per pass)

Units: **count calls** = calls of `countSolutions` (one per uniqueness count; **not** depth-first node entries, which are not instrumented; the r1 records' `counts.dfsEntries` holds this number); **search-loop checks** = budget checks of the depth-first search loop (propagation checks are not included); **restricted solves** = calls of the allowed-set solve; **skipped counts** = counts skipped by a complete sound proof (G1 only). The solver's own budget checks are not instrumented.

### normal (G0: 20 requests, 394 dug samples; G1: 20 requests, 394 dug samples)

| sign passes | arm | passes | removals | count calls | search-loop checks | restricted solves | skipped counts | count calls / removal | checks / removal | solves / removal | count calls / pass | pass wall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| firstTechnique | G0 | 394 | 42552 | 42552 | 10216 | 40465 | 0 | 1 | 0.24 | 0.951 | 108 | 10508.9 ms |
| firstTechnique | G1 | 394 | 42552 | 2355 | 6567 | 42552 | 40197 | 0.055 | 0.154 | 1 | 5.977 | 8919.8 ms |
| laterTechnique | G0 | 145 | 847 | 847 | 2309 | 228 | 0 | 1 | 2.726 | 0.269 | 5.841 | 149.6 ms |
| laterTechnique | G1 | 145 | 847 | 847 | 2309 | 228 | 0 | 1 | 2.726 | 0.269 | 5.841 | 139.4 ms |
| minimal | G0 | 539 | 3057 | 3057 | 12595 | 0 | 0 | 1 | 4.12 | 0 | 5.672 | 420.0 ms |
| minimal | G1 | 539 | 3057 | 3057 | 12595 | 0 | 0 | 1 | 4.12 | 0 | 5.672 | 398.0 ms |
| all | G0 | 1078 | 46456 | 46456 | 25120 | 40693 | 0 | 1 | 0.541 | 0.876 | 43.095 | 11078.5 ms |
| all | G1 | 1078 | 46456 | 6259 | 21471 | 42780 | 40197 | 0.135 | 0.462 | 0.921 | 5.806 | 9457.1 ms |

| per request (completed) | arm | count calls p50 / p95 / max | search-loop checks p50 / p95 / max | restricted solves p50 / p95 / max | removals p50 / p95 / max |
| --- | --- | --- | --- | --- | --- |
| n = 20 | G0 | 1512 / 35211 / 46106 | 1282 / 155721 / 168800 | 1295 / 5138 / 6009 | 1495 / 5673 / 6674 |
| n = 20 | G1 | 292 / 30283 / 40297 | 1122 / 155466 / 168333 | 1351 / 5362 / 6326 | 1495 / 5673 / 6674 |

Cumulative over the whole request (setup help, passes, tuning, keeper counts, safety count, local search): G0 count calls 253800, search-loop checks 1093830, solves 41738; G1 213603, 1090181, 43825. (The nearest-rank p95 is the maximum only for n < 20 and the second-largest value at n = 20.)

### nightmare (G0: 6 requests, 175 dug samples; G1: 6 requests, 175 dug samples)

| sign passes | arm | passes | removals | count calls | search-loop checks | restricted solves | skipped counts | count calls / removal | checks / removal | solves / removal | count calls / pass | pass wall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| firstTechnique | G0 | 175 | 18900 | 18900 | 98993 | 16359 | 0 | 1 | 5.238 | 0.866 | 108 | 23780.7 ms |
| firstTechnique | G1 | 175 | 18900 | 2541 | 33692 | 18900 | 16359 | 0.134 | 1.783 | 1 | 14.52 | 277863.7 ms |
| laterTechnique | G0 | 376 | 4525 | 4525 | 42076 | 917 | 0 | 1 | 9.299 | 0.203 | 12.035 | 3325.4 ms |
| laterTechnique | G1 | 376 | 4525 | 4525 | 42076 | 917 | 0 | 1 | 9.299 | 0.203 | 12.035 | 3331.5 ms |
| minimal | G0 | 551 | 6149 | 6149 | 82870 | 0 | 0 | 1 | 13.477 | 0 | 11.16 | 1276.2 ms |
| minimal | G1 | 551 | 6149 | 6149 | 82870 | 0 | 0 | 1 | 13.477 | 0 | 11.16 | 1281.4 ms |
| all | G0 | 1102 | 29574 | 29574 | 223939 | 17276 | 0 | 1 | 7.572 | 0.584 | 26.837 | 28382.3 ms |
| all | G1 | 1102 | 29574 | 13215 | 158638 | 19817 | 16359 | 0.447 | 5.364 | 0.67 | 11.992 | 282476.6 ms |

| per request (completed) | arm | count calls p50 / p95 / max | search-loop checks p50 / p95 / max | restricted solves p50 / p95 / max | removals p50 / p95 / max |
| --- | --- | --- | --- | --- | --- |
| n = 6 | G0 | 24480 / 48044 / 48044 | 182694 / 298089 / 298089 | 2892 / 5383 / 5383 | 4901 / 8673 / 8673 |
| n = 6 | G1 | 21882 / 43168 / 43168 | 169133 / 277195 / 277195 | 3318 / 6123 / 6123 | 4901 / 8673 / 8673 |

Cumulative over the whole request (setup help, passes, tuning, keeper counts, safety count, local search): G0 count calls 147473, search-loop checks 919824, solves 18044; G1 131114, 854523, 20585. (The nearest-rank p95 is the maximum only for n < 20 and the second-largest value at n = 20.)

G1 against G0, first technique pass (the only pass G1 changes; wall ratio is G0 / G1):

| cohort | count calls G0 | count calls G1 | counts skipped by proof | solves G0 | solves G1 | extra solves | solves on candidates the count rejects | pass wall G0 | pass wall G1 | wall ratio G0 / G1 | regression |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | 42552 | 2355 | 40197 | 40465 | 42552 | 2087 | 2087 | 10508.9 ms | 8919.8 ms | 1.178 | no regression in the first technique pass |
| nightmare | 18900 | 2541 | 16359 | 16359 | 18900 | 2541 | 2541 | 23780.7 ms | 277863.7 ms | 0.086 | the first technique pass took more wall time in G1 although it skipped 16359 count(s) |

G1 results over all first technique passes (61452 questions): {"tried":61452,"proved":56556,"stuckAmbiguous":4628,"stuckUnique":268,"stoppedContradiction":0,"stoppedError":0,"stoppedUnsoundProof":0,"stoppedMalformed":0}.

## Failures and stops (IG-S09-ASTRA-F2)

Stops by the G1 oracle: {"total":0,"contradiction":0,"error":0,"unsoundProof":0,"malformedReport":0}; error decisions in the sign passes: {"g0":0,"g1":0}; first failures recorded: 0 (unrecognised 0); censored or failed requests: 0. The r1 records were written by code that retried a G1 solver failure through the native order; they recorded the four counters as fallbackContradiction / fallbackError / fallbackShape / unsoundProof, all 0 in every pass, and no error decision in any sign pass, so no failure was converted into an ordinary rejection in these records. They carry no firstFailure field (new in the r2 code, which stops the request instead of retrying and records the first failure's code, site and ordinal).

## Counter units (IG-S09-ASTRA-F1)

| counter | unit |
| --- | --- |
| dfsCalls | calls of SG.dfs.countSolutions (one per uniqueness count, whatever its depth); NOT depth-first node entries |
| dfsChecks | budget checks of the depth-first search loop (`ws.budget.check()` in `search`); propagation checks are not included |
| restrictedSolves | calls of the allowed-set restricted solve (`solveWithin`) |
| countWithinCalls | calls of the digger's `countWithin` (keeper offers and the local search): one UNIQUE_NODES slice each |
| countWithinNodes | budget checks counted by the UNIQUE_NODES slices (search-loop AND propagation checks), not search nodes |
| nodeEntries | not instrumented (null) |
| solverBudgetChecks | not instrumented (null) |

Recorded field check: 52 records with a capture; `counts.dfsEntries` equals the count of `countSolutions` calls in 52 of them (differs in 0). In these records counts.dfsEntries is the count of countSolutions CALLS (capture.totals.dfsCalls), not depth-first node entries; node entries and the solver's own budget checks are not instrumented. The records are not rewritten; the r2 documents say dfsCalls / count calls.

## Generation time (request wall ready-to-decision, and total CPU; instrumented)

Wall is ready to decision. **Total CPU** is the CPU of the whole request from worker start to cleanup (startup and cleanup included); it is not the CPU from ready to decision.

### normal (20 completed pairs)

| arm | ready wall p50 / p95 / max | total CPU (startup and cleanup included) p50 / p95 / max | sum ready wall | sum total CPU |
| --- | --- | --- | --- | --- |
| G0 | 405.8 ms / 5318.1 ms / 7494.1 ms | 969.0 ms / 8453.0 ms / 12704.0 ms | 41.30 s | 70.39 s |
| G1 | 364.0 ms / 5245.1 ms / 6893.2 ms | 719.0 ms / 9187.0 ms / 11688.0 ms | 40.08 s | 68.05 s |

**Ratio of cohort totals (G0 / G1)**: sum of ready wall 41.30 s / 40.08 s = 1.03; sum of total CPU 70.39 s / 68.05 s = 1.034 (the total-CPU ratio). a ratio of cohort totals: long requests weigh more; it is not a median of paired ratios.

**Paired summary (G0 / G1 per pair)**: median per-pair ready-wall ratio 1.083 (n = 20), median per-pair total-CPU ratio 1.081 (n = 20); G0 ran first in 10 pairs (median 1.087), G1 first in 10 (median 1.024). Paired summaries of per-pair ratios (n pairs); the nearest-rank p95 of n observations is the maximum only while n < 20 and the second-largest value at n = 20, and is never a tail estimate; time-separated pairs (one request after the other, alternating order); an instrumented run is not an uninstrumented headline; the ratio of one pair carries no tail estimate; an unresolved CPU interval is unknown (null).

| stage (summed over the completed pairs) | G0 | G1 | G1 - G0 |
| --- | --- | --- | --- |
| engineMs | 41194.9 ms | 39976.7 ms | -1218.1 ms |
| fullGridAndModelSetupMs | 95.2 ms | 93.8 ms | -1.4 ms |
| signPlacementMs | 18.1 ms | 17.7 ms | -0.3 ms |
| setupCluePlacementMs | 261.0 ms | 230.6 ms | -30.4 ms |
| signPassFirstTechniqueMs | 10508.9 ms | 8919.8 ms | -1589.2 ms |
| signPassLaterTechniqueMs | 149.6 ms | 139.4 ms | -10.2 ms |
| signPassMinimalMs | 420.0 ms | 398.0 ms | -22.0 ms |
| tuningMs | 240.1 ms | 207.8 ms | -32.4 ms |
| afterStrategyMs | 55.0 ms | 53.8 ms | -1.2 ms |
| localSearchMs | 29387.6 ms | 29856.8 ms | 469.2 ms |
| otherMs | 59.3 ms | 59.1 ms | -0.2 ms |

the stages are the same code with the same inputs in both arms except the first technique sign pass: only signPassFirstTechniqueMs differs by design (and the setup-free parts it feeds none); any other difference is measurement noise or time separation and is attributed to nothing.

### nightmare (6 completed pairs)

| arm | ready wall p50 / p95 / max | total CPU (startup and cleanup included) p50 / p95 / max | sum ready wall | sum total CPU |
| --- | --- | --- | --- | --- |
| G0 | 9705.1 ms / 16291.1 ms / 16291.1 ms | 12688.0 ms / 21484.0 ms / 21484.0 ms | 51.95 s | 68.67 s |
| G1 | 60496.9 ms / 100844.7 ms / 100844.7 ms | 64313.0 ms / 104781.0 ms / 104781.0 ms | 305.89 s | 320.72 s |

**Ratio of cohort totals (G0 / G1)**: sum of ready wall 51.95 s / 305.89 s = 0.17; sum of total CPU 68.67 s / 320.72 s = 0.214 (the total-CPU ratio). a ratio of cohort totals: long requests weigh more; it is not a median of paired ratios.

**Paired summary (G0 / G1 per pair)**: median per-pair ready-wall ratio 0.174 (n = 6), median per-pair total-CPU ratio 0.206 (n = 6); G0 ran first in 3 pairs (median 0.178), G1 first in 3 (median 0.174). Paired summaries of per-pair ratios (n pairs); the nearest-rank p95 of n observations is the maximum only while n < 20 and the second-largest value at n = 20, and is never a tail estimate; time-separated pairs (one request after the other, alternating order); an instrumented run is not an uninstrumented headline; the ratio of one pair carries no tail estimate; an unresolved CPU interval is unknown (null).

| stage (summed over the completed pairs) | G0 | G1 | G1 - G0 |
| --- | --- | --- | --- |
| engineMs | 51911.4 ms | 305848.2 ms | 253936.8 ms |
| fullGridAndModelSetupMs | 29.8 ms | 30.0 ms | 0.2 ms |
| signPlacementMs | 6.4 ms | 6.0 ms | -0.4 ms |
| setupCluePlacementMs | 135.0 ms | 135.0 ms | 0.1 ms |
| signPassFirstTechniqueMs | 23780.7 ms | 277863.7 ms | 254082.9 ms |
| signPassLaterTechniqueMs | 3325.4 ms | 3331.5 ms | 6.2 ms |
| signPassMinimalMs | 1276.2 ms | 1281.4 ms | 5.2 ms |
| tuningMs | 4496.2 ms | 4489.0 ms | -7.2 ms |
| afterStrategyMs | 92.2 ms | 86.0 ms | -6.2 ms |
| localSearchMs | 18746.9 ms | 18603.3 ms | -143.6 ms |
| otherMs | 22.8 ms | 22.3 ms | -0.4 ms |

the stages are the same code with the same inputs in both arms except the first technique sign pass: only signPassFirstTechniqueMs differs by design (and the setup-free parts it feeds none); any other difference is measurement noise or time separation and is attributed to nothing.

## Local-stage time by cohort and arm (measured, not the request-group share)

Numerator: the local-search samples' spans; every denominator: the engine run (worker wall) of the same completed requests. Validation, probes, controls and the development check are not in it.

| cohort | arm | completed requests | with a local search | with a capped one | measured local-stage share of all engine time (ms) | request-group share: engine time of requests with a capped local search (ms) | local-stage share inside those requests (ms) | local search end reasons |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | G0 | 20 | 11 | 10 | 71.3 % (29387.607 of 41194.875) | 94.3 % (38850.364 of 41194.875) | 75.6 % (29386.006 of 38850.364) | {"proposals":21,"null":2} |
| normal | G1 | 20 | 11 | 10 | 74.7 % (29856.783 of 39976.734) | 95.0 % (37958.679 of 39976.734) | 78.7 % (29855.146 of 37958.679) | {"proposals":21,"null":2} |
| nightmare | G0 | 6 | 4 | 4 | 36.1 % (18746.884 of 51911.447) | 95.6 % (49627.1 of 51911.447) | 37.8 % (18746.884 of 49627.1) | {"proposals":12} |
| nightmare | G1 | 6 | 4 | 4 | 6.1 % (18603.281 of 305848.232) | 96.0 % (293697.094 of 305848.232) | 6.3 % (18603.281 of 293697.094) | {"proposals":12} |

Historical (MS05e, a different instrument): 95 % (a request-group share, not a stage share).

## Miss split (exact predicate; miss-split.json)

Named trap: complete canonical rating below the requested band AND finalClues <= spec.minClues + 1 AND an independently proved minimal sign set (removing each remaining sign admits another solution; a count cap is unknown, not minimal).

### normal

| bucket (disjoint) | G0 share of dug samples | G1 share of dug samples |
| --- | --- | --- |
| exact | 4.6 % (18 of 394) | 4.6 % (18 of 394) |
| shallow | 5.3 % (21 of 394) | 5.3 % (21 of 394) |
| above-or-unrated | 0.0 % (0 of 394) | 0.0 % (0 of 394) |
| below-trap | 21.1 % (83 of 394) | 21.1 % (83 of 394) |
| below-tune | 21.6 % (85 of 394) | 21.6 % (85 of 394) |
| below-setup2 | 47.5 % (187 of 394) | 47.5 % (187 of 394) |
| other-below | 0.0 % (0 of 394) | 0.0 % (0 of 394) |
| unconfirmed | 0.0 % (0 of 394) | 0.0 % (0 of 394) |

- G0: named trap lower 22.1 % (83 of 376) of the misses, upper 22.1 % (83 of 376); minimality asked for 83 eligible sample(s) (decided 83, unknown 0); cheap clue-floor clause true for 24.4 % (96 of 394) of the samples; below the band and at the floor (needing a proof) 21.1 % (83 of 394); diagnosis {"complete":10,"reused-only":10}, reused samples 160, unstarted 0, unfinished not recorded (r1 records): a missing row is unstarted or unfinished.
- G1: named trap lower 22.1 % (83 of 376) of the misses, upper 22.1 % (83 of 376); minimality asked for 83 eligible sample(s) (decided 83, unknown 0); cheap clue-floor clause true for 24.4 % (96 of 394) of the samples; below the band and at the floor (needing a proof) 21.1 % (83 of 394); diagnosis {"reused-only":10,"complete":10}, reused samples 234, unstarted 0, unfinished not recorded (r1 records): a missing row is unstarted or unfinished.

### nightmare

| bucket (disjoint) | G0 share of dug samples | G1 share of dug samples |
| --- | --- | --- |
| exact | 3.4 % (6 of 175) | 3.4 % (6 of 175) |
| shallow | 32.0 % (56 of 175) | 32.0 % (56 of 175) |
| above-or-unrated | 0.0 % (0 of 175) | 0.0 % (0 of 175) |
| below-trap | 10.9 % (19 of 175) | 10.9 % (19 of 175) |
| below-tune | 49.7 % (87 of 175) | 49.7 % (87 of 175) |
| below-setup2 | 4.0 % (7 of 175) | 4.0 % (7 of 175) |
| other-below | 0.0 % (0 of 175) | 0.0 % (0 of 175) |
| unconfirmed | 0.0 % (0 of 175) | 0.0 % (0 of 175) |

- G0: named trap lower 11.2 % (19 of 169) of the misses, upper 11.2 % (19 of 169); minimality asked for 19 eligible sample(s) (decided 19, unknown 0); cheap clue-floor clause true for 14.3 % (25 of 175) of the samples; below the band and at the floor (needing a proof) 10.9 % (19 of 175); diagnosis {"complete":3,"reused-only":3}, reused samples 103, unstarted 0, unfinished not recorded (r1 records): a missing row is unstarted or unfinished.
- G1: named trap lower 11.2 % (19 of 169) of the misses, upper 11.2 % (19 of 169); minimality asked for 19 eligible sample(s) (decided 19, unknown 0); cheap clue-floor clause true for 14.3 % (25 of 175) of the samples; below the band and at the floor (needing a proof) 10.9 % (19 of 175); diagnosis {"reused-only":3,"complete":3}, reused samples 72, unstarted 0, unfinished not recorded (r1 records): a missing row is unstarted or unfinished.

Historical Normal 300-319 (MS05e before; not a substitute): 394 dug samples, 376 misses, named trap 83 of 376 (22.1 %), setup two or more above the floor 187 of 376 (49.7 %), below after a tune reveal 85 of 376 (22.6 %).

Setup origins (clue-floor rule, unit-floor rule, solvability help; an origin is not proof of present necessity), over all dug samples of the Normal cohort:

| arm | groups clue-floor / unit-floor / help / tune | cells clue-floor / unit-floor / help / tune | samples with unit-floor groups | samples with help groups | below+setup2 excess from |
| --- | --- | --- | --- | --- | --- |
| g0 | 4851 / 280 / 112 / 145 | 9579 / 536 / 224 / 287 | 219 | 94 | {"unit-floor only":109,"help only":35,"unit-floor and help":43,"neither (the clue-floor groups overshoot)":0} |
| g1 | 4851 / 280 / 112 / 145 | 9579 / 536 / 224 / 287 | 219 | 94 | {"unit-floor only":109,"help only":35,"unit-floor and help":43,"neither (the clue-floor groups overshoot)":0} |

## Setup probes (limited counterfactual, setup-probes-r2.json): executed group checks and reused copies, apart

Requests with a probe: 26 of 52 (first missed sample with above-floor groups): **13 requests executed their probe** (15 executed group checks) and **13 requests reused a donor's rows** (15 reused copies; 13 distinct donor requests). The 30 listed rows are 15 executed plus 15 reused copies, **not 30 independent executions**; done 30, not done 0. Limited counterfactual coverage of one sample per request: not a population intervention coverage. The listed rows are 15 executed group checks plus 15 reused copies; they are never 30 independent probe executions.

| rows | group rows | done | blocked by clue-floor / unit-floor / neither rule | after removal: unique / not unique / unknown | solve after removal: solved / stuck / contradiction / unknown or error |
| --- | --- | --- | --- | --- | --- |
| executed (the observations) | 15 | 15 | 0 / 10 / 5 | 10 / 5 / 0 | 10 / 5 / 0 / 0 |
| reused copies (repeats of a donor row) | 15 | 15 | 0 / 10 / 5 | 10 / 5 / 0 | 10 / 5 / 0 / 0 |

The executed rows are the observations; the reused copies repeat a donor row and are listed apart, never added to the executed results.

## Internal guards (per arm, completed requests)

### G0 (26 requests, 569 dug samples)

| guard | limit | observed | which guard bound |
| --- | --- | --- | --- |
| sign-pass count and restricted solve | no external budget object reaches these calls in these requests (seen by 0 of 569 samples); any internal limit of the count or of the solver: not instrumented | search-loop budget checks (cumulative over the request, not search nodes) 2013654 in 401273 countSolutions calls; the solver's own budget checks: not instrumented; MAX_TUNE_ROUNDS 8: the largest number of tune rounds seen is 7; the solvability-help loop is bounded by the cell count (probes per sample, max 4) | no guard event recorded: 0 error decision(s) in the sign passes (a binding guard is recorded as an error decision) |
| UNIQUE_NODES (digger.js countWithin: keeper offers and the local search) | 200000 budget checks per count slice (the slice counts search-loop AND propagation budget checks, so it is not a search-node count) | 324639 counts, 5194180 budget checks in all, largest single 315, trips 0 | none recorded: no count reached the slice (0 trips) |
| safety uniqueness count | no external budget object in these requests; internal limit: not instrumented | not instrumented separately: it is inside the after-strategy part of a sample | not instrumented |
| OBJECTIVE_STEPS (digger.js digGuidedSteps / boundedObjective) | 100000 solver steps per solve | 0 entries; not reached: the sign strategy does not run stage B | none: stage B not entered (0 entries) |
| CAP_RATINGS 1024 / CAP_PROPOSALS 32768 / SHALLOW_SEARCH_RATINGS 256 per attempt (wire.work) | 1024 / 32768 / 256 | 59 attempts; most ratings 61, most proposals 32768; local-search cap reasons {"proposals":33,"null":2} | see the local-stage section |

### G1 (26 requests, 569 dug samples)

| guard | limit | observed | which guard bound |
| --- | --- | --- | --- |
| sign-pass count and restricted solve | no external budget object reaches these calls in these requests (seen by 0 of 569 samples); any internal limit of the count or of the solver: not instrumented | search-loop budget checks (cumulative over the request, not search nodes) 1944704 in 344717 countSolutions calls; the solver's own budget checks: not instrumented; MAX_TUNE_ROUNDS 8: the largest number of tune rounds seen is 7; the solvability-help loop is bounded by the cell count (probes per sample, max 4) | no guard event recorded: 0 error decision(s) in the sign passes (a binding guard is recorded as an error decision) |
| UNIQUE_NODES (digger.js countWithin: keeper offers and the local search) | 200000 budget checks per count slice (the slice counts search-loop AND propagation budget checks, so it is not a search-node count) | 324639 counts, 5194180 budget checks in all, largest single 315, trips 0 | none recorded: no count reached the slice (0 trips) |
| safety uniqueness count | no external budget object in these requests; internal limit: not instrumented | not instrumented separately: it is inside the after-strategy part of a sample | not instrumented |
| OBJECTIVE_STEPS (digger.js digGuidedSteps / boundedObjective) | 100000 solver steps per solve | 0 entries; not reached: the sign strategy does not run stage B | none: stage B not entered (0 entries) |
| CAP_RATINGS 1024 / CAP_PROPOSALS 32768 / SHALLOW_SEARCH_RATINGS 256 per attempt (wire.work) | 1024 / 32768 / 256 | 59 attempts; most ratings 61, most proposals 32768; local-search cap reasons {"proposals":33,"null":2} | see the local-stage section |

## Observer overhead (two singleton controls; ratio = captured G0 / observer-free control)

| control | status | control ready wall | G0 ready wall | difference (G0 - control) | ratio G0 / control | control total CPU | G0 total CPU | total-CPU ratio G0 / control | G0 capture build |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IG-S09/observer-control/greaterThan:normal:300/native | n = 1, time-separated | 2087.4 ms | 2098.2 ms | 10.8 ms | 1.005 | 3515.0 ms | 3609.0 ms | 1.027 | 2.6 ms |
| IG-S09/observer-control/greaterThan:nightmare:700/native | n = 1, time-separated | 12173.0 ms | 12089.2 ms | -83.9 ms | 0.993 | 16610.0 ms | 15578.0 ms | 0.938 | 0.6 ms |

Compatibility of each control with its captured G0 (source, trace, configuration, output digests):

| control | runtime fingerprint equal | harness fingerprint equal | trace (control / G0) | configuration equal | output digests equal | exactness equal | adapters (control / G0) | ran under the wrapper lock | compatible |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IG-S09/observer-control/greaterThan:normal:300/native | true | true | summary / summary | true | true | true | [] / ["gt-diagnostic"] | true | true |
| IG-S09/observer-control/greaterThan:nightmare:700/native | true | true | summary / summary | true | true | true | [] / ["gt-diagnostic"] | true | true |

Each control is a singleton, time-separated from its G0 request (another command at another time). Two singletons do not establish population-wide overhead; no statement about uninstrumented latency in general follows and no G1 timing is corrected with them. The control requests are not cohort observations.

## Diagnosis and validation cost (post-timing, outside every generation figure; controls and the development check are separate)

Diagnosis worker (rating, minimality, probes) on the recorded requests: wall 3.29 s (sample rows 0.81 s, probe rows 0.03 s, worker start and other 2.45 s), total CPU of the calls 4.64 s. Harness final-puzzle validation: wall 5.20 s, total CPU 5.90 s.

Diagnosis allowance (IG-S09-ASTRA-F3): promised 30.00 s. r1 code: the host allowed 30000 ms + DIAG_GRACE_MS (3000 ms) = 33 s from the start of the diagnosis. r2 code: the allowance is 30000 ms from the start of the diagnosis, bounded by the command deadline; worker start and a 2000 ms margin are inside it; rows that arrived are kept; started work without a result is unfinished (unknown), work never reported started is unstarted. Recorded diagnoses: {"requests":52,"diagnosisStatuses":{"complete":26,"reused-only":26},"rows":1138,"unstartedSamples":0,"unfinishedSamples":"not recorded (r1 records): a missing row is unstarted or unfinished","reusedSamples":569,"longestDiagnosisWallMs":201.149}. The longest recorded diagnosis took 201.149 ms, inside the 30 s allowance, so none of the recorded results can depend on the r1 grace and they stand.

## Machine time

| command | attempt | occupied | charged (+45 s grace) | priority wait (not charged) | status |
| --- | --- | --- | --- | --- | --- |
| normal-300-304 | a1 | 18.19 s | 63.19 s | 54.22 s | complete |
| normal-305-309 | a1 | 19.68 s | 64.68 s | 45.09 s | complete |
| normal-310-314 | a1 | 27.86 s | 72.86 s | 45.11 s | complete |
| normal-315-319 | a1 | 34.47 s | 79.47 s | 84.21 s | complete |
| nightmare-700-701 | a1 | 199.90 s | 244.90 s | 45.08 s | complete |
| nightmare-702-703 | a1 | 90.25 s | 135.25 s | 45.10 s | complete |
| nightmare-704-705 | a1 | 75.94 s | 120.94 s | 45.11 s | complete |
| observer-control | a1 | 17.35 s | 62.35 s | 550.27 s | complete |

Charged 895.68 s of the 990.00 s ceiling (allocation 900.00 s + approved extra 90.00 s: Astra (pack author), 2026-11-15: observer-control only): the 8 ledger commands 843.64 s plus the development check (7.04 s occupied + grace) 52.04 s, charged once; remaining 94.32 s. The common budget reader (manifest.budgetState over records.collectCharges: ledger entries plus every command.json the ledger does not reference) gives charged 895.68 s, remaining 94.32 s: equal to this report, the development check is not charged twice.

Priority waits (never charged): the 8 shard / control commands recorded **914.19 s** in all (the 8 shard/control commands of the ledger only; their dispatcher-recorded waits). This is the known partial figure, **not an all-task total**: the development check's wait is unknown: the check took its "requested" timestamp after its own admission (requestedAt 2026-11-15T02:49:34.308Z is not before admittedAt 2026-11-15T02:49:34.269Z), so the recorded 0 is not a wait; no wrapper record of this command's wait exists.

## Acceptance criteria

| id | status | evidence |
| --- | --- | --- |
| B01 | met for the recorded requests | miss-split.json: the exact predicate "complete canonical rating below the requested band AND finalClues <= spec.minClues + 1 AND an independently proved minimal sign set (removing each remaining sign admits another solution; a count cap is unknown, not minimal)", cheap clauses before minimality; normal: G0 394 samples, G1 394; nightmare: G0 175 samples, G1 175; minimality unknown for 0 eligible and 0 unconfirmed samples (denominators and unknowns are in the tables); scoped to the recorded requests (Normal 20/20 pairs, Nightmare 6/10 pairs); no global G1 winner and no production adoption follows |
| B02 | met for the recorded requests | whole-pass and whole-request physical countSolutions calls / search-loop budget checks / restricted solves / skips, per removal, per pass and per request, in the Physical work tables; node entries and the solver's own checks are not instrumented; no saving is inferred from a per-probe cost; scoped to the recorded requests (Normal 20/20 pairs, Nightmare 6/10 pairs); no global G1 winner and no production adoption follows |
| B03 | met | a diagnostic only: no guided pool, setup-clue policy change or IR29 adoption is made or authorised; G1 is a private in-memory order; scoped to the recorded requests (Normal 20/20 pairs, Nightmare 6/10 pairs); no global G1 winner and no production adoption follows |
| T01 | met for the recorded requests | G1 skipped 56556 count(s) only after a complete, non-uniqueness-assuming proof; stuck 4896 (native count run); stops by the G1 oracle: contradiction 0, solver error 0, uniqueness-assuming proof 0, malformed report 0; error decisions in the sign passes G0 0, G1 0; unrecognised first failures 0 (a failure is preserved with its code, site and ordinal and stops the request; it is never retried through the native order and never counted as met). The r1 records were produced by the retrying code and recorded 0 in every such counter |
| T02 | met for the recorded pairs | pairs: {"total":26,"identityOk":26,"guardBindingDifference":0,"mismatch":0,"notComparable":0,"deferred":0}; a guard-binding-difference is classified apart, never counted as identity; the eight unstarted request rows have no identity result |
| T03 | PARTIAL | Normal 20/20 pairs; Nightmare 6/10 pairs; 8 experimental request rows unstarted (Nightmare seeds 706, 707, 708, 709; budget-limited by the pack author's ruling, not excluded, failed or replaced); the controls (2/2) are a separate population. Every recorded sample, setup origin, local stage and capped / unknown check is accounted for in samples.json and miss-split.json; unstarted or timed-out rows stay unconfirmed |
| T04 | met | generation wall (ready to decision) and total CPU (startup and cleanup included) per request, and the diagnosis / validation wall and total CPU of their calls, are separate fields (Diagnosis cost); the stage time split names full-grid / model setup, setup-clue placement, the sign passes, tuning and the local search apart |
| T05 | met for the coverage established | 2 of 2 singleton observer-free controls recorded, 2 compatible with their captured G0 (source, trace, configuration, output digests); two singletons do not establish population-wide overhead and do not justify correcting any G1 timing; capture build time is reported; no instrumented number is called an uninstrumented headline |

## Sources

| item | value |
| --- | --- |
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| harness fingerprints of the commands | 9da69f60fbd2d71eeaec2949f805ba8fac3c6f2c6bf88b5848398e5b16c128ed |
| writer (aggregator) fingerprint of this report, revision r2 | d414ebac04fdf7a6bbc465311831d96752dda0604b426c55a3ccedd8c4d77ec4 |
| aggregator file sha-256 | 667f99203e8d6f72e64cfce07498c970bcce7653d8ee326ffbb9ecd863831eb4 |
| adapters | gt-diagnostic |
| adapter hashes | d5fd6349b824de98223eecbbb001327e08b6ece223d95fb1b5d33842e465eaae |
| sources stable | true |
| firewall clean | true |
| node | v26.13.0 |
| platform | win32 10.0.26300 x64 |
| cpu | AMD EPYC 7763 64-Core Processor (16 logical processors) |

## Deviations and disclosures

- Partial, budget-limited diagnostic: Nightmare seeds 706-709 (eight request rows) were never started; the pack author ruled that they are not finished in this pre-freeze round. Normal 300-319 is complete (20 of 20 pairs); Nightmare is 6 of 10 pairs. Conclusions are scoped to the recorded requests: no global G1 winner, no production adoption.
- Proof reuse is symmetric: whichever arm of a pair runs first is diagnosed in full and the other reuses a row only when the full canonical input (level, solution, givens, signs), the runtime fingerprint and the guard settings match; the donor is recorded per sample (validationReusedFrom). An unreached row stays unknown (unconfirmed). Accepted by the pack author.
- Three development-check requests (Normal seed 300: G0, G1 and an observer-free native request, command IG-S09/dev-check, charged 52.04 s) validated the instrumentation before the shards; they are not cohort observations and not substitutes for the controls, and they are in no table.
- The catalogue is taken from the ready message of the first request of each command (no separate probe); the sources were fingerprint-checked and the adapter transforms dry-run before any generation. Accepted by the pack author.
- The observer-free controls ran in their own command (observer-control) under the harness fingerprint of the shards (no harness edit between the shards and the controls), inside the runner and the priority wrapper; they are singletons and a separate population.
- Reporting writer revision r2: this report was written after the commands; the aggregator is a harness file, so the writer fingerprint differs from the fingerprint the commands recorded (both are in Sources). Raw records are unchanged. Pure tests, plan-only runs, the transform dry-run and the aggregator dry runs ran unwrapped (no engine, no worker thread).
- Counters: count calls are calls of countSolutions (the r1 records alias them to counts.dfsEntries; they are not node entries); search-loop checks exclude propagation checks; UNIQUE_NODES counts budget checks; node entries, propagation checks and the solver's own budget checks are not instrumented (null), never zero.
- The recorded requests ran under the harness fingerprint(s) in Sources, before the r2 code changes: their G1 oracle retried a solver failure through the native order (the recorded counters show none) and their diagnosis allowance carried a 3 s grace (the recorded diagnosis walls are in diagnosisDeadline.recorded). The r2 behaviour (G1 stops on a solver failure, 30 s deadline, executed / reused probe split, unknown dev-check wait) is covered by the r2 pure tests with scripted engines; no engine request ran with the r2 code and none is needed for these corrections.
