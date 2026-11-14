# IG-S02 / sam (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: provisional; the S5a estimate is judged on the task summary across all six cells.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 6 | 6 | 0 | 0 | 0 | true |

Exclusions: native-w1 and attempts-w4 share one request and the same default attempts; no override; the unmeasured catalogue probe and the independent audit are outside every generation time; a censored or unverified arm proves neither identity nor speed

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | dd759a22bf13b732face5b950b3e3054cf12e79115f0f5eed536e74f306406fd |
| adapters | attempt-pool |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Paired rows (before = reference, after = prototype)

| pair | ref ready ms | ref cold ms | ref cpu ms | proto ready ms | proto cold ms | proto cpu ms | cpu factor | ready factor | cold factor |
|---|---|---|---|---|---|---|---|---|---|
| samurai:nightmare:1 | 26528.689 | 26615.370 | 27141 | 14825.124 | 14927.853 | 28234 | 1.040 | 0.559 | 0.561 |
| samurai:nightmare:2 | 24933.614 | 25020.234 | 25561 | 13636.153 | 13742.042 | 26844 | 1.050 | 0.547 | 0.549 |
| samurai:nightmare:42 | 21697.037 | 21781.643 | 22391 | 12793.266 | 12895.066 | 22531 | 1.006 | 0.590 | 0.592 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 3 | 24933.614 | 26528.689 | 26528.689 | 24933.614 |
| cold wall ms | 3 | 25020.234 | 26615.370 | 26615.370 | 25020.234 |
| cpu total ms | 3 | 25561 | 27141 | 27141 | 25561 |

Requests 3, complete 3, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 75093 ms, resolved); per cold wall second 0 (all spent wall 73426.644 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 3 | 75093 | 73426.644 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 75093 | 73426.644 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 3 | 13636.153 | 14825.124 | 14825.124 | 13636.153 |
| cold wall ms | 3 | 13742.042 | 14927.853 | 14927.853 | 13742.042 |
| cpu total ms | 3 | 26844 | 28234 | 28234 | 26844 |

Requests 3, complete 3, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 77609 ms, resolved); per cold wall second 0 (all spent wall 41583.235 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 3 | 77609 | 41583.235 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 77609 | 41583.235 |

## Task details

```json
{
  "arms": {
    "reference": "native-w1 (full unmodified pipeline, one worker)",
    "prototype": "attempts-w4 (S5a: one absolute attempt per worker, min(4, A) workers, consumed in native order)"
  },
  "identity": {
    "pairs": [
      {
        "pairId": "samurai:nightmare:1",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "26f865482e18b243d16f11c690023463e50607597bb004d7b476749b2ab5241b",
        "pooledDigest": "26f865482e18b243d16f11c690023463e50607597bb004d7b476749b2ab5241b",
        "sections": [
          "structure",
          "givens",
          "solution",
          "rating",
          "config",
          "warnings",
          "log",
          "work",
          "scalars",
          "puzzle"
        ],
        "claimedExact": false,
        "verifiedExact": false,
        "puzzleHash": "f98f3e849c6aa099717fb2d5d7455b5777f03b0ccca5e56c65a7e137acf649f6"
      },
      {
        "pairId": "samurai:nightmare:2",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "468ffd63d09093251fde79398b25a43d1019a4e928292ff54dcdb6c414ae56ff",
        "pooledDigest": "468ffd63d09093251fde79398b25a43d1019a4e928292ff54dcdb6c414ae56ff",
        "sections": [
          "structure",
          "givens",
          "solution",
          "rating",
          "config",
          "warnings",
          "log",
          "work",
          "scalars",
          "puzzle"
        ],
        "claimedExact": false,
        "verifiedExact": false,
        "puzzleHash": "b6231fc3ecf400a79990bd7f249fe22d4599f9ba8e0dc9ef6b0fdea381d37102"
      },
      {
        "pairId": "samurai:nightmare:42",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "95955fe0e5d55620af7fe78d7227be736d2e0662eee3006ea1b331e112920821",
        "pooledDigest": "95955fe0e5d55620af7fe78d7227be736d2e0662eee3006ea1b331e112920821",
        "sections": [
          "structure",
          "givens",
          "solution",
          "rating",
          "config",
          "warnings",
          "log",
          "work",
          "scalars",
          "puzzle"
        ],
        "claimedExact": false,
        "verifiedExact": false,
        "puzzleHash": "a79c68ee57d91e728c84a001b5de18b4d95db170f2b3461c92afad9c909bb587"
      }
    ],
    "failed": 0,
    "ok": 3,
    "notComparable": 0,
    "deferred": 0,
    "complete": true
  },
  "pairs": [
    {
      "pairId": "samurai:nightmare:1",
      "cell": "samurai",
      "seed": 1,
      "firstArm": "native-w1",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 26528.6892,
        "coldWallMs": 26615.370499999997,
        "occupiedWallMs": 26618.493199999997,
        "cpuTotalMs": 27141,
        "cpuToDecisionMs": 27141,
        "cpuResolutionStatus": "resolved",
        "startupMs": 86.68129999999996,
        "cleanupMs": 3.1226999999998952,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 2,
        "attemptsPlanned": 2,
        "puzzleHash": "f98f3e849c6aa099717fb2d5d7455b5777f03b0ccca5e56c65a7e137acf649f6",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": null
      },
      "pooled": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 14825.1244,
        "coldWallMs": 14927.852900000002,
        "occupiedWallMs": 14934.064199999997,
        "cpuTotalMs": 28234,
        "cpuToDecisionMs": 28234,
        "cpuResolutionStatus": "resolved",
        "startupMs": 102.72850000000108,
        "cleanupMs": 6.21129999999539,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 2,
        "attemptsPlanned": 2,
        "puzzleHash": "f98f3e849c6aa099717fb2d5d7455b5777f03b0ccca5e56c65a7e137acf649f6",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 2,
          "peakActive": 2,
          "meanBusyLanes": 1.816,
          "attemptsStarted": 2,
          "attemptsConsumed": 2,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 102.729,
          "allReadyMs": 103.178,
          "duplicatedModelBuildMs": 3.011,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": 1.7894412541995264,
      "coldSpeedup": 1.7829335992452064,
      "occupiedSpeedup": 1.7824011497151595,
      "cpuRatio": 1.040271176448915,
      "identity": "identity-ok"
    },
    {
      "pairId": "samurai:nightmare:2",
      "cell": "samurai",
      "seed": 2,
      "firstArm": "attempts-w4",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 24933.6141,
        "coldWallMs": 25020.234300000004,
        "occupiedWallMs": 25023.510199999997,
        "cpuTotalMs": 25561,
        "cpuToDecisionMs": 25561,
        "cpuResolutionStatus": "resolved",
        "startupMs": 86.62020000000484,
        "cleanupMs": 3.275899999993271,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 2,
        "attemptsPlanned": 2,
        "puzzleHash": "b6231fc3ecf400a79990bd7f249fe22d4599f9ba8e0dc9ef6b0fdea381d37102",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": null
      },
      "pooled": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 13636.152700000006,
        "coldWallMs": 13742.042100000006,
        "occupiedWallMs": 13747.5314,
        "cpuTotalMs": 26844,
        "cpuToDecisionMs": 26828,
        "cpuResolutionStatus": "resolved",
        "startupMs": 105.88940000000002,
        "cleanupMs": 5.489299999993818,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 2,
        "attemptsPlanned": 2,
        "puzzleHash": "b6231fc3ecf400a79990bd7f249fe22d4599f9ba8e0dc9ef6b0fdea381d37102",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 2,
          "peakActive": 2,
          "meanBusyLanes": 1.869,
          "attemptsStarted": 2,
          "attemptsConsumed": 2,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 105.889,
          "allReadyMs": 106.361,
          "duplicatedModelBuildMs": 3.104,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": 1.828493318353643,
      "coldSpeedup": 1.820707149485446,
      "occupiedSpeedup": 1.8202184429998827,
      "cpuRatio": 1.050193654395368,
      "identity": "identity-ok"
    },
    {
      "pairId": "samurai:nightmare:42",
      "cell": "samurai",
      "seed": 42,
      "firstArm": "native-w1",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 21697.037200000006,
        "coldWallMs": 21781.642900000006,
        "occupiedWallMs": 21784.640400000004,
        "cpuTotalMs": 22391,
        "cpuToDecisionMs": 22391,
        "cpuResolutionStatus": "resolved",
        "startupMs": 84.60570000000007,
        "cleanupMs": 2.9974999999976717,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 2,
        "attemptsPlanned": 2,
        "puzzleHash": "a79c68ee57d91e728c84a001b5de18b4d95db170f2b3461c92afad9c909bb587",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": null
      },
      "pooled": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 12793.266300000003,
        "coldWallMs": 12895.065500000012,
        "occupiedWallMs": 12901.638900000005,
        "cpuTotalMs": 22531,
        "cpuToDecisionMs": 22531,
        "cpuResolutionStatus": "resolved",
        "startupMs": 101.79920000000857,
        "cleanupMs": 6.573399999993853,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 2,
        "attemptsPlanned": 2,
        "puzzleHash": "a79c68ee57d91e728c84a001b5de18b4d95db170f2b3461c92afad9c909bb587",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 2,
          "peakActive": 2,
          "meanBusyLanes": 1.669,
          "attemptsStarted": 2,
          "attemptsConsumed": 2,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 101.799,
          "allReadyMs": 102.144,
          "duplicatedModelBuildMs": 2.982,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": 1.69597323241837,
      "coldSpeedup": 1.6891455805323352,
      "occupiedSpeedup": 1.6885172937214972,
      "cpuRatio": 1.0062525121700683,
      "identity": "identity-ok"
    }
  ],
  "cells": [
    {
      "cell": "samurai",
      "attemptsPlanned": 2,
      "pairs": 3,
      "completePairs": 3,
      "identity": {
        "ok": 3,
        "failed": 0,
        "notComparable": 0,
        "deferred": 0
      },
      "native": {
        "requests": 3,
        "complete": 3,
        "censored": 0,
        "errors": 0,
        "validationUnknown": 0,
        "verifiedExact": 0,
        "readyWallS": {
          "n": 3,
          "p50": 24.93,
          "p95": 26.53,
          "max": 26.53,
          "upperMedian": 24.93,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 3,
          "p50": 25.02,
          "p95": 26.62,
          "max": 26.62,
          "upperMedian": 25.02,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 3,
          "p50": 25.56,
          "p95": 27.14,
          "max": 27.14,
          "upperMedian": 25.56,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        }
      },
      "pooled": {
        "requests": 3,
        "complete": 3,
        "censored": 0,
        "errors": 0,
        "validationUnknown": 0,
        "verifiedExact": 0,
        "readyWallS": {
          "n": 3,
          "p50": 13.64,
          "p95": 14.83,
          "max": 14.83,
          "upperMedian": 13.64,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 3,
          "p50": 13.74,
          "p95": 14.93,
          "max": 14.93,
          "upperMedian": 13.74,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 3,
          "p50": 26.84,
          "p95": 28.23,
          "max": 28.23,
          "upperMedian": 26.84,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        }
      },
      "readySpeedup": {
        "n": 3,
        "p50": 1.7894412541995264,
        "p95": 1.828493318353643,
        "max": 1.828493318353643,
        "upperMedian": 1.7894412541995264,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "readySpeedupMin": 1.69597323241837,
      "coldSpeedup": {
        "n": 3,
        "p50": 1.7829335992452064,
        "p95": 1.820707149485446,
        "max": 1.820707149485446,
        "upperMedian": 1.7829335992452064,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "cpuRatio": {
        "n": 3,
        "p50": 1.040271176448915,
        "p95": 1.050193654395368,
        "max": 1.050193654395368,
        "upperMedian": 1.040271176448915,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "pool": {
        "width": 2,
        "peakActive": 2,
        "meanBusyLanes": {
          "n": 3,
          "p50": 1.816,
          "p95": 1.869,
          "max": 1.869,
          "upperMedian": 1.816,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "attemptsConsumed": [
          2,
          2,
          2
        ],
        "attemptsStarted": [
          2,
          2,
          2
        ],
        "speculativeCompleted": 0,
        "firstExactOrigins": [
          null,
          null,
          null
        ],
        "firstExactOrdinals": [
          null,
          null,
          null
        ],
        "duplicatedModelBuildMs": [
          3.011,
          3.104,
          2.982
        ]
      },
      "above120s": {
        "native": 0,
        "pooled": 0
      },
      "report": {
        "attempts": 2,
        "today": [
          26.7,
          null
        ],
        "s5a": [
          1.7,
          1.8
        ],
        "afterFirstPhases": [
          10.3,
          11.6
        ]
      },
      "verdict": "estimate-supported (median ready-wall speed-up >= 1.7)",
      "verdictNote": "descriptive, n = 3 pairs; with n2/n3 the p95 is the observed maximum; provisional (pre-freeze); no availability, default or qualification decision follows"
    }
  ],
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S02/sam/samurai:nightmare:1/native-w1",
      "IG-S02/sam/samurai:nightmare:1/attempts-w4",
      "IG-S02/sam/samurai:nightmare:2/attempts-w4",
      "IG-S02/sam/samurai:nightmare:2/native-w1",
      "IG-S02/sam/samurai:nightmare:42/native-w1",
      "IG-S02/sam/samurai:nightmare:42/attempts-w4"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  },
  "catalogueProbe": {
    "wallMs": 106.29629999999997,
    "cpuMs": 125,
    "note": "unmeasured: loads the engine once per command so neither arm carries the catalogue discovery"
  },
  "syntheticPoolTests": null
}
```
