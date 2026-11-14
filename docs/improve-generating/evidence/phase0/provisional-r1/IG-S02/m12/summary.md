# IG-S02 / m12 (provisional-r1, a1)

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
| mega12:nightmare:1 | 23352.643 | 23457.408 | 23828 | 7692.945 | 7815.856 | 26703 | 1.121 | 0.329 | 0.333 |
| mega12:nightmare:2 | 22710.705 | 22794.999 | 23297 | 7062.955 | 7177.692 | 26313 | 1.129 | 0.311 | 0.315 |
| mega12:nightmare:3 | 23499.832 | 23597.588 | 23922 | 6857.242 | 6976.330 | 26095 | 1.091 | 0.292 | 0.296 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 3 | 23352.643 | 23499.832 | 23499.832 | 23352.643 |
| cold wall ms | 3 | 23457.408 | 23597.588 | 23597.588 | 23457.408 |
| cpu total ms | 3 | 23828 | 23922 | 23922 | 23828 |

Requests 3, complete 3, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 71047 ms, resolved); per cold wall second 0 (all spent wall 69868.183 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 3 | 71047 | 69868.183 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 71047 | 69868.183 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 3 | 7062.955 | 7692.945 | 7692.945 | 7062.955 |
| cold wall ms | 3 | 7177.692 | 7815.856 | 7815.856 | 7177.692 |
| cpu total ms | 3 | 26313 | 26703 | 26703 | 26313 |

Requests 3, complete 3, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 79111 ms, resolved); per cold wall second 0 (all spent wall 21993.949 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 3 | 79111 | 21993.949 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 79111 | 21993.949 |

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
        "pairId": "mega12:nightmare:1",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "089a457dfb267ab04472f05b95f7800f7cbbce2ce4fab25b1315f5330fe8a021",
        "pooledDigest": "089a457dfb267ab04472f05b95f7800f7cbbce2ce4fab25b1315f5330fe8a021",
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
        "puzzleHash": "290f5389a3e7d5afb4f16a1ea945014c968b9cbb1b472febc662a8f97e5aaad2"
      },
      {
        "pairId": "mega12:nightmare:2",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "8d09588a7b1ab2eb56ff890dbc15ad8297957bd84f08e6f2a387fb3ee1b92ffe",
        "pooledDigest": "8d09588a7b1ab2eb56ff890dbc15ad8297957bd84f08e6f2a387fb3ee1b92ffe",
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
        "puzzleHash": "c27720d7a6a903b668cb0fa164c25c5de31fc577013c6437631b1a05ec3f9a85"
      },
      {
        "pairId": "mega12:nightmare:3",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "31ab8a793ef7db28e5fd6af04df2fb26c03a3f9194409ae3338bf983ff57821a",
        "pooledDigest": "31ab8a793ef7db28e5fd6af04df2fb26c03a3f9194409ae3338bf983ff57821a",
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
        "puzzleHash": "da06846642b580acd05fd918eaaf19348df9a69f7e0e569eac26d50079a386cf"
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
      "pairId": "mega12:nightmare:1",
      "cell": "mega12",
      "seed": 1,
      "firstArm": "native-w1",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 23352.643099999998,
        "coldWallMs": 23457.408099999997,
        "occupiedWallMs": 23462.708799999997,
        "cpuTotalMs": 23828,
        "cpuToDecisionMs": 23828,
        "cpuResolutionStatus": "resolved",
        "startupMs": 104.76499999999999,
        "cleanupMs": 5.300699999999779,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 4,
        "attemptsPlanned": 4,
        "puzzleHash": "290f5389a3e7d5afb4f16a1ea945014c968b9cbb1b472febc662a8f97e5aaad2",
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
        "readyWallMs": 7692.945100000001,
        "coldWallMs": 7815.856,
        "occupiedWallMs": 7824.321099999997,
        "cpuTotalMs": 26703,
        "cpuToDecisionMs": 26610,
        "cpuResolutionStatus": "resolved",
        "startupMs": 122.91089999999895,
        "cleanupMs": 8.46509999999762,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 4,
        "attemptsPlanned": 4,
        "puzzleHash": "290f5389a3e7d5afb4f16a1ea945014c968b9cbb1b472febc662a8f97e5aaad2",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 4,
          "peakActive": 4,
          "meanBusyLanes": 3.165,
          "attemptsStarted": 4,
          "attemptsConsumed": 4,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 122.911,
          "allReadyMs": 127.186,
          "duplicatedModelBuildMs": 7.789,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": 3.035592064734739,
      "coldSpeedup": 3.001258991977334,
      "occupiedSpeedup": 2.998689407059228,
      "cpuRatio": 1.1206563706563706,
      "identity": "identity-ok"
    },
    {
      "pairId": "mega12:nightmare:2",
      "cell": "mega12",
      "seed": 2,
      "firstArm": "attempts-w4",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 22710.7048,
        "coldWallMs": 22794.9994,
        "occupiedWallMs": 22801.7022,
        "cpuTotalMs": 23297,
        "cpuToDecisionMs": 23281,
        "cpuResolutionStatus": "resolved",
        "startupMs": 84.29460000000108,
        "cleanupMs": 6.702799999999115,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 4,
        "attemptsPlanned": 4,
        "puzzleHash": "c27720d7a6a903b668cb0fa164c25c5de31fc577013c6437631b1a05ec3f9a85",
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
        "readyWallMs": 7062.955399999999,
        "coldWallMs": 7177.692499999997,
        "occupiedWallMs": 7185.5100999999995,
        "cpuTotalMs": 26313,
        "cpuToDecisionMs": 26297,
        "cpuResolutionStatus": "resolved",
        "startupMs": 114.73709999999846,
        "cleanupMs": 7.81760000000213,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 4,
        "attemptsPlanned": 4,
        "puzzleHash": "c27720d7a6a903b668cb0fa164c25c5de31fc577013c6437631b1a05ec3f9a85",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 4,
          "peakActive": 4,
          "meanBusyLanes": 3.429,
          "attemptsStarted": 4,
          "attemptsConsumed": 4,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 114.737,
          "allReadyMs": 115.741,
          "duplicatedModelBuildMs": 6.193,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": 3.2154676780204507,
      "coldSpeedup": 3.1758116414154003,
      "occupiedSpeedup": 3.173289283943808,
      "cpuRatio": 1.1294587285916642,
      "identity": "identity-ok"
    },
    {
      "pairId": "mega12:nightmare:3",
      "cell": "mega12",
      "seed": 3,
      "firstArm": "native-w1",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 23499.831900000005,
        "coldWallMs": 23597.58830000001,
        "occupiedWallMs": 23603.7719,
        "cpuTotalMs": 23922,
        "cpuToDecisionMs": 23922,
        "cpuResolutionStatus": "resolved",
        "startupMs": 97.75640000000567,
        "cleanupMs": 6.183599999989383,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 4,
        "attemptsPlanned": 4,
        "puzzleHash": "da06846642b580acd05fd918eaaf19348df9a69f7e0e569eac26d50079a386cf",
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
        "readyWallMs": 6857.242400000003,
        "coldWallMs": 6976.330000000002,
        "occupiedWallMs": 6984.117500000008,
        "cpuTotalMs": 26095,
        "cpuToDecisionMs": 26095,
        "cpuResolutionStatus": "resolved",
        "startupMs": 119.08759999999893,
        "cleanupMs": 7.787500000005821,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 4,
        "attemptsPlanned": 4,
        "puzzleHash": "da06846642b580acd05fd918eaaf19348df9a69f7e0e569eac26d50079a386cf",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 4,
          "peakActive": 4,
          "meanBusyLanes": 3.486,
          "attemptsStarted": 4,
          "attemptsConsumed": 4,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 119.088,
          "allReadyMs": 123.89,
          "duplicatedModelBuildMs": 6.472,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": 3.427009070001666,
      "coldSpeedup": 3.3825217987107843,
      "occupiedSpeedup": 3.379635565982384,
      "cpuRatio": 1.0908368865479474,
      "identity": "identity-ok"
    }
  ],
  "cells": [
    {
      "cell": "mega12",
      "attemptsPlanned": 4,
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
          "p50": 23.35,
          "p95": 23.5,
          "max": 23.5,
          "upperMedian": 23.35,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 3,
          "p50": 23.46,
          "p95": 23.6,
          "max": 23.6,
          "upperMedian": 23.46,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 3,
          "p50": 23.83,
          "p95": 23.92,
          "max": 23.92,
          "upperMedian": 23.83,
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
          "p50": 7.06,
          "p95": 7.69,
          "max": 7.69,
          "upperMedian": 7.06,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 3,
          "p50": 7.18,
          "p95": 7.82,
          "max": 7.82,
          "upperMedian": 7.18,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 3,
          "p50": 26.31,
          "p95": 26.7,
          "max": 26.7,
          "upperMedian": 26.31,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        }
      },
      "readySpeedup": {
        "n": 3,
        "p50": 3.2154676780204507,
        "p95": 3.427009070001666,
        "max": 3.427009070001666,
        "upperMedian": 3.2154676780204507,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "readySpeedupMin": 3.035592064734739,
      "coldSpeedup": {
        "n": 3,
        "p50": 3.1758116414154003,
        "p95": 3.3825217987107843,
        "max": 3.3825217987107843,
        "upperMedian": 3.1758116414154003,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "cpuRatio": {
        "n": 3,
        "p50": 1.1206563706563706,
        "p95": 1.1294587285916642,
        "max": 1.1294587285916642,
        "upperMedian": 1.1206563706563706,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "pool": {
        "width": 4,
        "peakActive": 4,
        "meanBusyLanes": {
          "n": 3,
          "p50": 3.429,
          "p95": 3.486,
          "max": 3.486,
          "upperMedian": 3.429,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "attemptsConsumed": [
          4,
          4,
          4
        ],
        "attemptsStarted": [
          4,
          4,
          4
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
          7.789,
          6.193,
          6.472
        ]
      },
      "above120s": {
        "native": 0,
        "pooled": 0
      },
      "report": {
        "attempts": 4,
        "today": [
          23.7,
          25.2
        ],
        "s5a": [
          2.8,
          3
        ],
        "afterFirstPhases": [
          5.4,
          7.2
        ]
      },
      "verdict": "estimate-supported (median ready-wall speed-up >= 2.8)",
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
      "IG-S02/m12/mega12:nightmare:1/native-w1",
      "IG-S02/m12/mega12:nightmare:1/attempts-w4",
      "IG-S02/m12/mega12:nightmare:2/attempts-w4",
      "IG-S02/m12/mega12:nightmare:2/native-w1",
      "IG-S02/m12/mega12:nightmare:3/native-w1",
      "IG-S02/m12/mega12:nightmare:3/attempts-w4"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  },
  "catalogueProbe": {
    "wallMs": 102.28340000000003,
    "cpuMs": 125,
    "note": "unmeasured: loads the engine once per command so neither arm carries the catalogue discovery"
  },
  "syntheticPoolTests": null
}
```
