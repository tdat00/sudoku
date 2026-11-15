# IG-S09 Greater-Than miss predicate and solve-first diagnostic (provisional, pre-freeze; pre-MS07)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Pre-MS07: the catalogue, floors and search may change when difficulty-v3 freezes. Every figure is an instrumented diagnostic (trace summary, capture hooks); none is an uninstrumented headline.

## Coverage

- Experimental pairs: Normal 20 of 20, Nightmare 6 of 10 (recorded and completed; **partial, budget-limited**). Requests recorded 52, completed 52, censored or failed 0, unstarted 8 of the 60 planned request rows (Nightmare seeds 706, 707, 708, 709: **unstarted**, not excluded, failed or replaced; the pack author ruled that they are not finished in this pre-freeze round).
- Observer-free controls (a separate population): 2 of 2 recorded.
- Population: Greater-Than Normal, literal seeds 300-319 (20 paired requests); Greater-Than Nightmare, literal seeds 700-709 (10 paired requests). trace SUMMARY (the historical diagnostic population), other options and defaults native; arm order alternates by seed index.

Direction of every comparison below: **G0 / G1** (a value below 1 means G1 took longer). Ratios of cohort totals and paired summaries (medians of per-pair ratios) are labelled apart.

## G0 / G1 identity and parity (order-parity.json)

Pairs: {"total":26,"identityOk":26,"guardBindingDifference":0,"mismatch":0,"notComparable":0,"deferred":0}. Controls (observer-free native against the captured G0): control:greaterThan:normal:300 identity-ok; control:greaterThan:nightmare:700 identity-ok.

## Physical work (cumulative over the completed requests; per-pass figures per pass)

### normal (G0: 20 requests, 394 dug samples; G1: 20 requests, 394 dug samples)

| sign passes | arm | passes | removals | DFS calls | DFS node checks | restricted solves | skipped DFS | DFS calls / removal | checks / removal | solves / removal | DFS calls / pass | pass wall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| firstTechnique | G0 | 394 | 42552 | 42552 | 10216 | 40465 | 0 | 1 | 0.24 | 0.951 | 108 | 10508.9 ms |
| firstTechnique | G1 | 394 | 42552 | 2355 | 6567 | 42552 | 40197 | 0.055 | 0.154 | 1 | 5.977 | 8919.8 ms |
| laterTechnique | G0 | 145 | 847 | 847 | 2309 | 228 | 0 | 1 | 2.726 | 0.269 | 5.841 | 149.6 ms |
| laterTechnique | G1 | 145 | 847 | 847 | 2309 | 228 | 0 | 1 | 2.726 | 0.269 | 5.841 | 139.4 ms |
| minimal | G0 | 539 | 3057 | 3057 | 12595 | 0 | 0 | 1 | 4.12 | 0 | 5.672 | 420.0 ms |
| minimal | G1 | 539 | 3057 | 3057 | 12595 | 0 | 0 | 1 | 4.12 | 0 | 5.672 | 398.0 ms |
| all | G0 | 1078 | 46456 | 46456 | 25120 | 40693 | 0 | 1 | 0.541 | 0.876 | 43.095 | 11078.5 ms |
| all | G1 | 1078 | 46456 | 6259 | 21471 | 42780 | 40197 | 0.135 | 0.462 | 0.921 | 5.806 | 9457.1 ms |

| per request (completed) | arm | DFS calls p50 / p95 / max | DFS checks p50 / p95 / max | restricted solves p50 / p95 / max | removals p50 / p95 / max |
| --- | --- | --- | --- | --- | --- |
| n = 20 | G0 | 1512 / 35211 / 46106 | 1282 / 155721 / 168800 | 1295 / 5138 / 6009 | 1495 / 5673 / 6674 |
| n = 20 | G1 | 292 / 30283 / 40297 | 1122 / 155466 / 168333 | 1351 / 5362 / 6326 | 1495 / 5673 / 6674 |

Cumulative over the whole request (setup help, passes, tuning, keeper counts, safety count, local search): G0 DFS calls 253800, checks 1093830, solves 41738; G1 213603, 1090181, 43825. The solver's own budget checks are not instrumented; DFS checks are search-node checks only.

### nightmare (G0: 6 requests, 175 dug samples; G1: 6 requests, 175 dug samples)

| sign passes | arm | passes | removals | DFS calls | DFS node checks | restricted solves | skipped DFS | DFS calls / removal | checks / removal | solves / removal | DFS calls / pass | pass wall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| firstTechnique | G0 | 175 | 18900 | 18900 | 98993 | 16359 | 0 | 1 | 5.238 | 0.866 | 108 | 23780.7 ms |
| firstTechnique | G1 | 175 | 18900 | 2541 | 33692 | 18900 | 16359 | 0.134 | 1.783 | 1 | 14.52 | 277863.7 ms |
| laterTechnique | G0 | 376 | 4525 | 4525 | 42076 | 917 | 0 | 1 | 9.299 | 0.203 | 12.035 | 3325.4 ms |
| laterTechnique | G1 | 376 | 4525 | 4525 | 42076 | 917 | 0 | 1 | 9.299 | 0.203 | 12.035 | 3331.5 ms |
| minimal | G0 | 551 | 6149 | 6149 | 82870 | 0 | 0 | 1 | 13.477 | 0 | 11.16 | 1276.2 ms |
| minimal | G1 | 551 | 6149 | 6149 | 82870 | 0 | 0 | 1 | 13.477 | 0 | 11.16 | 1281.4 ms |
| all | G0 | 1102 | 29574 | 29574 | 223939 | 17276 | 0 | 1 | 7.572 | 0.584 | 26.837 | 28382.3 ms |
| all | G1 | 1102 | 29574 | 13215 | 158638 | 19817 | 16359 | 0.447 | 5.364 | 0.67 | 11.992 | 282476.6 ms |

| per request (completed) | arm | DFS calls p50 / p95 / max | DFS checks p50 / p95 / max | restricted solves p50 / p95 / max | removals p50 / p95 / max |
| --- | --- | --- | --- | --- | --- |
| n = 6 | G0 | 24480 / 48044 / 48044 | 182694 / 298089 / 298089 | 2892 / 5383 / 5383 | 4901 / 8673 / 8673 |
| n = 6 | G1 | 21882 / 43168 / 43168 | 169133 / 277195 / 277195 | 3318 / 6123 / 6123 | 4901 / 8673 / 8673 |

Cumulative over the whole request (setup help, passes, tuning, keeper counts, safety count, local search): G0 DFS calls 147473, checks 919824, solves 18044; G1 131114, 854523, 20585. The solver's own budget checks are not instrumented; DFS checks are search-node checks only.

G1 against G0, first technique pass (the only pass G1 changes; wall ratio is G0 / G1):

| cohort | DFS calls G0 | DFS calls G1 | skipped by proof | solves G0 | solves G1 | extra solves | solves on candidates the count rejects | pass wall G0 | pass wall G1 | wall ratio G0 / G1 | regression |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | 42552 | 2355 | 40197 | 40465 | 42552 | 2087 | 2087 | 10508.9 ms | 8919.8 ms | 1.178 | no regression in the first technique pass |
| nightmare | 18900 | 2541 | 16359 | 16359 | 18900 | 2541 | 2541 | 23780.7 ms | 277863.7 ms | 0.086 | the first technique pass took more wall time in G1 although it skipped 16359 count(s) |

G1 results over all first technique passes (61452 questions): {"proved":56556,"stuckAmbiguous":4628,"stuckUnique":268,"fallbackContradiction":0,"fallbackError":0,"fallbackShape":0,"unsoundProof":0,"tried":61452}.

## Generation time (request wall and CPU, ready-to-decision; instrumented)

### normal (20 completed pairs)

| arm | ready wall p50 / p95 / max | cpu p50 / p95 / max | sum ready wall | sum cpu |
| --- | --- | --- | --- | --- |
| G0 | 405.8 ms / 5318.1 ms / 7494.1 ms | 969.0 ms / 8453.0 ms / 12704.0 ms | 41.30 s | 70.39 s |
| G1 | 364.0 ms / 5245.1 ms / 6893.2 ms | 719.0 ms / 9187.0 ms / 11688.0 ms | 40.08 s | 68.05 s |

**Ratio of cohort totals (G0 / G1)**: sum of ready wall 41.30 s / 40.08 s = 1.03; sum of CPU 70.39 s / 68.05 s = 1.034. a ratio of cohort totals: long requests weigh more; it is not a median of paired ratios.

**Paired summary (G0 / G1 per pair)**: median per-pair ready-wall ratio 1.083 (n = 20), median per-pair CPU ratio 1.081 (n = 20); G0 ran first in 10 pairs (median 1.087), G1 first in 10 (median 1.024). paired summaries of per-pair ratios (n pairs; p95 is the observed maximum); time-separated pairs (one request after the other, alternating order); an instrumented run is not an uninstrumented headline; the ratio of one pair carries no tail estimate; an unresolved CPU interval is unknown (null).

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

| arm | ready wall p50 / p95 / max | cpu p50 / p95 / max | sum ready wall | sum cpu |
| --- | --- | --- | --- | --- |
| G0 | 9705.1 ms / 16291.1 ms / 16291.1 ms | 12688.0 ms / 21484.0 ms / 21484.0 ms | 51.95 s | 68.67 s |
| G1 | 60496.9 ms / 100844.7 ms / 100844.7 ms | 64313.0 ms / 104781.0 ms / 104781.0 ms | 305.89 s | 320.72 s |

**Ratio of cohort totals (G0 / G1)**: sum of ready wall 51.95 s / 305.89 s = 0.17; sum of CPU 68.67 s / 320.72 s = 0.214. a ratio of cohort totals: long requests weigh more; it is not a median of paired ratios.

**Paired summary (G0 / G1 per pair)**: median per-pair ready-wall ratio 0.174 (n = 6), median per-pair CPU ratio 0.206 (n = 6); G0 ran first in 3 pairs (median 0.178), G1 first in 3 (median 0.174). paired summaries of per-pair ratios (n pairs; p95 is the observed maximum); time-separated pairs (one request after the other, alternating order); an instrumented run is not an uninstrumented headline; the ratio of one pair carries no tail estimate; an unresolved CPU interval is unknown (null).

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

- G0: named trap lower 22.1 % (83 of 376) of the misses, upper 22.1 % (83 of 376); minimality asked for 83 eligible sample(s) (decided 83, unknown 0); cheap clue-floor clause true for 24.4 % (96 of 394) of the samples; below the band and at the floor (needing a proof) 21.1 % (83 of 394); diagnosis {"complete":10,"reused-only":10}, reused samples 160, unstarted 0.
- G1: named trap lower 22.1 % (83 of 376) of the misses, upper 22.1 % (83 of 376); minimality asked for 83 eligible sample(s) (decided 83, unknown 0); cheap clue-floor clause true for 24.4 % (96 of 394) of the samples; below the band and at the floor (needing a proof) 21.1 % (83 of 394); diagnosis {"reused-only":10,"complete":10}, reused samples 234, unstarted 0.

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

- G0: named trap lower 11.2 % (19 of 169) of the misses, upper 11.2 % (19 of 169); minimality asked for 19 eligible sample(s) (decided 19, unknown 0); cheap clue-floor clause true for 14.3 % (25 of 175) of the samples; below the band and at the floor (needing a proof) 10.9 % (19 of 175); diagnosis {"complete":3,"reused-only":3}, reused samples 103, unstarted 0.
- G1: named trap lower 11.2 % (19 of 169) of the misses, upper 11.2 % (19 of 169); minimality asked for 19 eligible sample(s) (decided 19, unknown 0); cheap clue-floor clause true for 14.3 % (25 of 175) of the samples; below the band and at the floor (needing a proof) 10.9 % (19 of 175); diagnosis {"reused-only":3,"complete":3}, reused samples 72, unstarted 0.

Historical Normal 300-319 (MS05e before; not a substitute): 394 dug samples, 376 misses, named trap 83 of 376 (22.1 %), setup two or more above the floor 187 of 376 (49.7 %), below after a tune reveal 85 of 376 (22.6 %).

Setup origins (clue-floor rule, unit-floor rule, solvability help; an origin is not proof of present necessity), over all dug samples of the Normal cohort:

| arm | groups clue-floor / unit-floor / help / tune | cells clue-floor / unit-floor / help / tune | samples with unit-floor groups | samples with help groups | below+setup2 excess from |
| --- | --- | --- | --- | --- | --- |
| g0 | 4851 / 280 / 112 / 145 | 9579 / 536 / 224 / 287 | 219 | 94 | {"unit-floor only":109,"help only":35,"unit-floor and help":43,"neither (the clue-floor groups overshoot)":0} |
| g1 | 4851 / 280 / 112 / 145 | 9579 / 536 / 224 / 287 | 219 | 94 | {"unit-floor only":109,"help only":35,"unit-floor and help":43,"neither (the clue-floor groups overshoot)":0} |

## Setup probes (limited counterfactual, setup-probes.json)

Coverage: {"requests":52,"withAMissedSample":48,"withAboveFloorGroups":26,"withProbe":26,"groupsProbed":30,"groupsDone":30,"groupsUnstarted":0,"note":"limited counterfactual coverage of one sample per request: not a population intervention coverage"}. Results (groups probed after timing): {"blockedByRule":{"clueFloor":0,"unitFloor":20,"neither":10},"uniquenessAfterRemoval":{"unique":20,"notUnique":10,"unknown":0},"solveAfterRemoval":{"solved":20,"stuck":10,"contradiction":0,"unknownOrError":0}}.

## Internal guards (per arm, completed requests)

### G0 (26 requests, 569 dug samples)

| guard | limit | observed | which guard bound |
| --- | --- | --- | --- |
| sign-pass count and restricted solve | none: the digger passes the request budget (null in these requests) and the sign passes create no node or step slice | DFS search-node checks (cumulative over the request) 2013654 in 401273 count calls; the solver's own budget checks: not instrumented; MAX_TUNE_ROUNDS 8: the largest number of tune rounds seen is 7; the solvability-help loop is bounded by the cell count (probes per sample, max 4); external budget seen by 0 of 569 samples | none observed (no guard exists on this path to bind) |
| UNIQUE_NODES (digger.js countWithin: keeper offers and the local search) | 200000 search nodes per count | 324639 counts, 5194180 nodes in all, largest single 315, trips 0 | none: no count reached the slice |
| safety uniqueness count | none (passes the request budget, null here) | not instrumented separately: it is inside the after-strategy part of a sample | none (no guard on it) |
| OBJECTIVE_STEPS (digger.js digGuidedSteps / boundedObjective) | 100000 solver steps per solve | 0 entries; not reached: the sign strategy does not run stage B | none |
| CAP_RATINGS 1024 / CAP_PROPOSALS 32768 / SHALLOW_SEARCH_RATINGS 256 per attempt (wire.work) | 1024 / 32768 / 256 | 59 attempts; most ratings 61, most proposals 32768; local-search cap reasons {"proposals":33,"null":2} | see the local-stage section |

### G1 (26 requests, 569 dug samples)

| guard | limit | observed | which guard bound |
| --- | --- | --- | --- |
| sign-pass count and restricted solve | none: the digger passes the request budget (null in these requests) and the sign passes create no node or step slice | DFS search-node checks (cumulative over the request) 1944704 in 344717 count calls; the solver's own budget checks: not instrumented; MAX_TUNE_ROUNDS 8: the largest number of tune rounds seen is 7; the solvability-help loop is bounded by the cell count (probes per sample, max 4); external budget seen by 0 of 569 samples | none observed (no guard exists on this path to bind) |
| UNIQUE_NODES (digger.js countWithin: keeper offers and the local search) | 200000 search nodes per count | 324639 counts, 5194180 nodes in all, largest single 315, trips 0 | none: no count reached the slice |
| safety uniqueness count | none (passes the request budget, null here) | not instrumented separately: it is inside the after-strategy part of a sample | none (no guard on it) |
| OBJECTIVE_STEPS (digger.js digGuidedSteps / boundedObjective) | 100000 solver steps per solve | 0 entries; not reached: the sign strategy does not run stage B | none |
| CAP_RATINGS 1024 / CAP_PROPOSALS 32768 / SHALLOW_SEARCH_RATINGS 256 per attempt (wire.work) | 1024 / 32768 / 256 | 59 attempts; most ratings 61, most proposals 32768; local-search cap reasons {"proposals":33,"null":2} | see the local-stage section |

## Observer overhead (two singleton controls; ratio = captured G0 / observer-free control)

| control | status | control ready wall | G0 ready wall | difference (G0 - control) | ratio G0 / control | control cpu | G0 cpu | cpu ratio | G0 capture build |
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

Diagnosis worker (rating, minimality, probes) on the recorded requests: wall 3.29 s (sample rows 0.81 s, probe rows 0.03 s, worker start and other 2.45 s), CPU 4.64 s. Harness final-puzzle validation: wall 5.20 s, CPU 5.90 s.

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

Charged 895.68 s of the 990.00 s ceiling (allocation 900.00 s + approved extra 90.00 s: Astra (pack author), 2026-11-15: observer-control only); the development check (7.04 s occupied) charged 52.04 s is included; remaining 94.32 s; priority waits of the commands 914.19 s (not charged).

## Acceptance criteria

| id | status | evidence |
| --- | --- | --- |
| B01 | met for the recorded requests | miss-split.json: the exact predicate "complete canonical rating below the requested band AND finalClues <= spec.minClues + 1 AND an independently proved minimal sign set (removing each remaining sign admits another solution; a count cap is unknown, not minimal)", cheap clauses before minimality; normal: G0 394 samples, G1 394; nightmare: G0 175 samples, G1 175; minimality unknown for 0 eligible and 0 unconfirmed samples (denominators and unknowns are in the tables); scoped to the recorded requests (Normal 20/20 pairs, Nightmare 6/10 pairs); no global G1 winner and no production adoption follows |
| B02 | met for the recorded requests | whole-pass and whole-request physical DFS calls / checks / skips, per removal, per pass and per request, in the Physical work tables; no saving is inferred from a per-probe cost; scoped to the recorded requests (Normal 20/20 pairs, Nightmare 6/10 pairs); no global G1 winner and no production adoption follows |
| B03 | met | a diagnostic only: no guided pool, setup-clue policy change or IR29 adoption is made or authorised; G1 is a private in-memory order; scoped to the recorded requests (Normal 20/20 pairs, Nightmare 6/10 pairs); no global G1 winner and no production adoption follows |
| T01 | met | G1 skipped 56556 count(s) only after a complete, non-uniqueness-assuming proof; stuck 4896 (native count run); fallbacks: contradiction 0, error 0, other shape 0, uniqueness-assuming proof 0 |
| T02 | met for the recorded pairs | pairs: {"total":26,"identityOk":26,"guardBindingDifference":0,"mismatch":0,"notComparable":0,"deferred":0}; a guard-binding-difference is classified apart, never counted as identity; the eight unstarted request rows have no identity result |
| T03 | PARTIAL | Normal 20/20 pairs; Nightmare 6/10 pairs; 8 experimental request rows unstarted (Nightmare seeds 706, 707, 708, 709; budget-limited by the pack author's ruling, not excluded, failed or replaced); the controls (2/2) are a separate population. Every recorded sample, setup origin, local stage and capped / unknown check is accounted for in samples.json and miss-split.json; unstarted or timed-out rows stay unconfirmed |
| T04 | met | generation cpu / wall (request) and diagnosis / validation wall and cpu are separate fields (Diagnosis cost) |
| T05 | met for the coverage established | 2 of 2 singleton observer-free controls recorded, 2 compatible with their captured G0 (source, trace, configuration, output digests); two singletons do not establish population-wide overhead and do not justify correcting any G1 timing; capture build time is reported; no instrumented number is called an uninstrumented headline |

## Sources

| item | value |
| --- | --- |
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| harness fingerprints of the commands | 9da69f60fbd2d71eeaec2949f805ba8fac3c6f2c6bf88b5848398e5b16c128ed |
| writer (aggregator) fingerprint of this report, revision r1 | 89105175e8324e903886a9aad31eeca27f4e04dc7ca7229edb32880ce2e758b6 |
| aggregator file sha-256 | 350e74ddae18c96df30a49a6122165041945199393f141426a770ec90c75f275 |
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
- Reporting writer revision r1: this report was written after the commands; the aggregator is a harness file, so the writer fingerprint differs from the fingerprint the commands recorded (both are in Sources). Raw records are unchanged. Pure tests, plan-only runs, the transform dry-run and the aggregator dry runs ran unwrapped (no engine, no worker thread).
- DFS "checks" are search-node checks of the depth-first count; propagation checks and the solver's own budget checks are not instrumented (null), never zero.
