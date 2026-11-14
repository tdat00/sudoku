# IG-S02 / gt (provisional-r1, a1)

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
| greaterThan:nightmare:1 | 926.866 | 1013.211 | 1531 | 1040.609 | 1155.781 | 6328 | 4.133 | 1.123 | 1.141 |
| greaterThan:nightmare:2 | 19319.900 | 19421.134 | 25594 | 6313.774 | 6421.889 | 31376 | 1.226 | 0.327 | 0.331 |
| greaterThan:nightmare:3 | 11565.728 | 11653.897 | 15500 | 4408.432 | 4516.465 | 24452 | 1.578 | 0.381 | 0.388 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 3 | 11565.728 | 19319.900 | 19319.900 | 11565.728 |
| cold wall ms | 3 | 11653.897 | 19421.134 | 19421.134 | 11653.897 |
| cpu total ms | 3 | 15500 | 25594 | 25594 | 15500 |

Requests 3, complete 3, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 3; per CPU second 0.070 (all spent CPU 42625 ms, resolved); per cold wall second 0.093 (all spent wall 32159.018 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 3 | 42625 | 32159.018 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 42625 | 32159.018 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 3 | 4408.432 | 6313.774 | 6313.774 | 4408.432 |
| cold wall ms | 3 | 4516.465 | 6421.889 | 6421.889 | 4516.465 |
| cpu total ms | 3 | 24452 | 31376 | 31376 | 24452 |

Requests 3, complete 3, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 3; per CPU second 0.048 (all spent CPU 62156 ms, resolved); per cold wall second 0.241 (all spent wall 12473.670 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 3 | 62156 | 12473.670 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 62156 | 12473.670 |

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
        "pairId": "greaterThan:nightmare:1",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "a21aef370b17a6c4a37629be101c95086beb1f86587533360553331eb6a3a1d9",
        "pooledDigest": "a21aef370b17a6c4a37629be101c95086beb1f86587533360553331eb6a3a1d9",
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
        "claimedExact": true,
        "verifiedExact": true,
        "puzzleHash": "43209b9cdb1435d74a599787b90ba8a51b69dff73bc7872f6a86a72e054959d9"
      },
      {
        "pairId": "greaterThan:nightmare:2",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "176853e01327994cde504323ace124788f7260cdfb739f31d580fba9c547c6f3",
        "pooledDigest": "176853e01327994cde504323ace124788f7260cdfb739f31d580fba9c547c6f3",
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
        "claimedExact": true,
        "verifiedExact": true,
        "puzzleHash": "eef4d6bf7ecd527e0ce83f9fdc21f378fddc394ccf7a6e88c1ac56927aafe0ae"
      },
      {
        "pairId": "greaterThan:nightmare:3",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "a75550bfe613914f81487b35f446a774b22899c6b09953870d5c25fe661b45e9",
        "pooledDigest": "a75550bfe613914f81487b35f446a774b22899c6b09953870d5c25fe661b45e9",
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
        "claimedExact": true,
        "verifiedExact": true,
        "puzzleHash": "cab90de52117228a5b8d93f65313701c5820a06b033ba596f32cbb19c2ecb46d"
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
      "pairId": "greaterThan:nightmare:1",
      "cell": "greaterThan",
      "seed": 1,
      "firstArm": "native-w1",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 926.8663,
        "coldWallMs": 1013.2113,
        "occupiedWallMs": 1045.6304,
        "cpuTotalMs": 1531,
        "cpuToDecisionMs": 1500,
        "cpuResolutionStatus": "resolved",
        "startupMs": 86.34500000000003,
        "cleanupMs": 32.41910000000007,
        "claimedExact": true,
        "verifiedExact": true,
        "validation": "verified",
        "attemptsUsed": 1,
        "attemptsPlanned": 8,
        "puzzleHash": "43209b9cdb1435d74a599787b90ba8a51b69dff73bc7872f6a86a72e054959d9",
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
        "readyWallMs": 1040.6086000000003,
        "coldWallMs": 1155.7814000000003,
        "occupiedWallMs": 1214.6698000000001,
        "cpuTotalMs": 6328,
        "cpuToDecisionMs": 6156,
        "cpuResolutionStatus": "resolved",
        "startupMs": 115.17280000000005,
        "cleanupMs": 58.88839999999982,
        "claimedExact": true,
        "verifiedExact": true,
        "validation": "verified",
        "attemptsUsed": 1,
        "attemptsPlanned": 8,
        "puzzleHash": "43209b9cdb1435d74a599787b90ba8a51b69dff73bc7872f6a86a72e054959d9",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 4,
          "peakActive": 4,
          "meanBusyLanes": 3.594,
          "attemptsStarted": 5,
          "attemptsConsumed": 1,
          "attemptsSpeculative": 4,
          "firstExactOrigin": "sample",
          "firstExactOrdinal": 1,
          "resultOrigin": "sample",
          "firstReadyMs": 115.173,
          "allReadyMs": 118.976,
          "duplicatedModelBuildMs": 1.658,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 1
        }
      },
      "readySpeedup": 0.8906963674911007,
      "coldSpeedup": 0.8766461374097211,
      "occupiedSpeedup": 0.8608351010291027,
      "cpuRatio": 4.1332462442847815,
      "identity": "identity-ok"
    },
    {
      "pairId": "greaterThan:nightmare:2",
      "cell": "greaterThan",
      "seed": 2,
      "firstArm": "attempts-w4",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 19319.8998,
        "coldWallMs": 19421.1339,
        "occupiedWallMs": 19441.2627,
        "cpuTotalMs": 25594,
        "cpuToDecisionMs": 25578,
        "cpuResolutionStatus": "resolved",
        "startupMs": 101.23409999999967,
        "cleanupMs": 20.12879999999859,
        "claimedExact": true,
        "verifiedExact": true,
        "validation": "verified",
        "attemptsUsed": 6,
        "attemptsPlanned": 8,
        "puzzleHash": "eef4d6bf7ecd527e0ce83f9fdc21f378fddc394ccf7a6e88c1ac56927aafe0ae",
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
        "readyWallMs": 6313.7736,
        "coldWallMs": 6421.8893,
        "occupiedWallMs": 6494.1958,
        "cpuTotalMs": 31376,
        "cpuToDecisionMs": 31235,
        "cpuResolutionStatus": "resolved",
        "startupMs": 108.11569999999983,
        "cleanupMs": 72.3065000000006,
        "claimedExact": true,
        "verifiedExact": true,
        "validation": "verified",
        "attemptsUsed": 6,
        "attemptsPlanned": 8,
        "puzzleHash": "eef4d6bf7ecd527e0ce83f9fdc21f378fddc394ccf7a6e88c1ac56927aafe0ae",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 4,
          "peakActive": 4,
          "meanBusyLanes": 3.619,
          "attemptsStarted": 8,
          "attemptsConsumed": 6,
          "attemptsSpeculative": 2,
          "firstExactOrigin": "sample",
          "firstExactOrdinal": 6,
          "resultOrigin": "sample",
          "firstReadyMs": 108.116,
          "allReadyMs": 113.478,
          "duplicatedModelBuildMs": 6.801,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 1
        }
      },
      "readySpeedup": 3.059960813292386,
      "coldSpeedup": 3.0242087636110453,
      "occupiedSpeedup": 2.993636671687663,
      "cpuRatio": 1.2259123232007503,
      "identity": "identity-ok"
    },
    {
      "pairId": "greaterThan:nightmare:3",
      "cell": "greaterThan",
      "seed": 3,
      "firstArm": "native-w1",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 11565.7277,
        "coldWallMs": 11653.897,
        "occupiedWallMs": 11672.1246,
        "cpuTotalMs": 15500,
        "cpuToDecisionMs": 15469,
        "cpuResolutionStatus": "resolved",
        "startupMs": 88.16930000000139,
        "cleanupMs": 18.227599999998347,
        "claimedExact": true,
        "verifiedExact": true,
        "validation": "verified",
        "attemptsUsed": 4,
        "attemptsPlanned": 8,
        "puzzleHash": "cab90de52117228a5b8d93f65313701c5820a06b033ba596f32cbb19c2ecb46d",
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
        "readyWallMs": 4408.431700000001,
        "coldWallMs": 4516.464699999997,
        "occupiedWallMs": 4764.804799999998,
        "cpuTotalMs": 24452,
        "cpuToDecisionMs": 24156,
        "cpuResolutionStatus": "resolved",
        "startupMs": 108.03299999999581,
        "cleanupMs": 248.34010000000126,
        "claimedExact": true,
        "verifiedExact": true,
        "validation": "verified",
        "attemptsUsed": 4,
        "attemptsPlanned": 8,
        "puzzleHash": "cab90de52117228a5b8d93f65313701c5820a06b033ba596f32cbb19c2ecb46d",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 4,
          "peakActive": 4,
          "meanBusyLanes": 3.903,
          "attemptsStarted": 8,
          "attemptsConsumed": 4,
          "attemptsSpeculative": 4,
          "firstExactOrigin": "sample",
          "firstExactOrdinal": 4,
          "resultOrigin": "sample",
          "firstReadyMs": 108.033,
          "allReadyMs": 110.01,
          "duplicatedModelBuildMs": 6.188,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 1
        }
      },
      "readySpeedup": 2.6235469861084604,
      "coldSpeedup": 2.580313978763082,
      "occupiedSpeedup": 2.449654306929846,
      "cpuRatio": 1.5775483870967741,
      "identity": "identity-ok"
    }
  ],
  "cells": [
    {
      "cell": "greaterThan",
      "attemptsPlanned": 8,
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
        "verifiedExact": 3,
        "readyWallS": {
          "n": 3,
          "p50": 11.57,
          "p95": 19.32,
          "max": 19.32,
          "upperMedian": 11.57,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 3,
          "p50": 11.65,
          "p95": 19.42,
          "max": 19.42,
          "upperMedian": 11.65,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 3,
          "p50": 15.5,
          "p95": 25.59,
          "max": 25.59,
          "upperMedian": 15.5,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        }
      },
      "pooled": {
        "requests": 3,
        "complete": 3,
        "censored": 0,
        "errors": 0,
        "validationUnknown": 0,
        "verifiedExact": 3,
        "readyWallS": {
          "n": 3,
          "p50": 4.41,
          "p95": 6.31,
          "max": 6.31,
          "upperMedian": 4.41,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 3,
          "p50": 4.52,
          "p95": 6.42,
          "max": 6.42,
          "upperMedian": 4.52,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 3,
          "p50": 24.45,
          "p95": 31.38,
          "max": 31.38,
          "upperMedian": 24.45,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        }
      },
      "readySpeedup": {
        "n": 3,
        "p50": 2.6235469861084604,
        "p95": 3.059960813292386,
        "max": 3.059960813292386,
        "upperMedian": 2.6235469861084604,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "readySpeedupMin": 0.8906963674911007,
      "coldSpeedup": {
        "n": 3,
        "p50": 2.580313978763082,
        "p95": 3.0242087636110453,
        "max": 3.0242087636110453,
        "upperMedian": 2.580313978763082,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "cpuRatio": {
        "n": 3,
        "p50": 1.5775483870967741,
        "p95": 4.1332462442847815,
        "max": 4.1332462442847815,
        "upperMedian": 1.5775483870967741,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "pool": {
        "width": 4,
        "peakActive": 4,
        "meanBusyLanes": {
          "n": 3,
          "p50": 3.619,
          "p95": 3.903,
          "max": 3.903,
          "upperMedian": 3.619,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "attemptsConsumed": [
          1,
          6,
          4
        ],
        "attemptsStarted": [
          5,
          8,
          8
        ],
        "speculativeCompleted": 3,
        "firstExactOrigins": [
          "sample",
          "sample",
          "sample"
        ],
        "firstExactOrdinals": [
          1,
          6,
          4
        ],
        "duplicatedModelBuildMs": [
          1.658,
          6.801,
          6.188
        ]
      },
      "above120s": {
        "native": 0,
        "pooled": 0
      },
      "report": {
        "attempts": 8,
        "today": [
          9.3,
          19.2
        ],
        "s5a": [
          2.8,
          3
        ],
        "afterFirstPhases": [
          2.2,
          6
        ]
      },
      "verdict": "inconclusive (median below 2.8 but a pair reaches it)",
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
      "IG-S02/gt/greaterThan:nightmare:1/native-w1",
      "IG-S02/gt/greaterThan:nightmare:1/attempts-w4",
      "IG-S02/gt/greaterThan:nightmare:2/attempts-w4",
      "IG-S02/gt/greaterThan:nightmare:2/native-w1",
      "IG-S02/gt/greaterThan:nightmare:3/native-w1",
      "IG-S02/gt/greaterThan:nightmare:3/attempts-w4"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  },
  "catalogueProbe": {
    "wallMs": 100.12270000000001,
    "cpuMs": 110,
    "note": "unmeasured: loads the engine once per command so neither arm carries the catalogue discovery"
  },
  "syntheticPoolTests": null
}
```
