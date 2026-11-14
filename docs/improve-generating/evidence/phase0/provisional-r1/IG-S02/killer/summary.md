# IG-S02 / killer (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **validation-failed** (exit 1). Estimate verdict: provisional; the S5a estimate is judged on the task summary across all six cells.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 6 | 0 | 0 | 6 | 0 | false |

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
| killer:nightmare:1 | 18004.284 | 18091.556 | 19297 | 7064.489 | 7175.335 | 23452 | n/a | n/a | n/a |
| killer:nightmare:2 | 30444.477 | 30527.638 | 31454 | 14729.159 | 14841.820 | 35297 | n/a | n/a | n/a |
| killer:nightmare:3 | 21114.451 | 21200.215 | 22157 | 7972.124 | 8080.738 | 25234 | n/a | n/a | n/a |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 0 | n/a | n/a | n/a | n/a |
| cold wall ms | 0 | n/a | n/a | n/a | n/a |
| cpu total ms | 0 | n/a | n/a | n/a | n/a |

Requests 3, complete 0, censored 0, errors 3, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 72908 ms, resolved); per cold wall second 0 (all spent wall 69856.507 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 0 | 0 | 0 |
| censored | 0 | 0 | 0 |
| errors | 3 | 72908 | 69856.507 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 72908 | 69856.507 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 0 | n/a | n/a | n/a | n/a |
| cold wall ms | 0 | n/a | n/a | n/a | n/a |
| cpu total ms | 0 | n/a | n/a | n/a | n/a |

Requests 3, complete 0, censored 0, errors 3, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 83983 ms, resolved); per cold wall second 0 (all spent wall 30151.490 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 0 | 0 | 0 |
| censored | 0 | 0 | 0 |
| errors | 3 | 83983 | 30151.490 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 83983 | 30151.490 |

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
        "pairId": "killer:nightmare:1",
        "verdict": "identity-failed",
        "problems": [
          "native-w1 outcome error",
          "attempts-w4 outcome error"
        ],
        "unproven": [],
        "unverified": [],
        "digestsEqual": null,
        "differing": null,
        "nativeDigest": "435f77ceb9b0ad742b7ffd468b42fe065c1146312359b43974e4b72c26d53506",
        "pooledDigest": "435f77ceb9b0ad742b7ffd468b42fe065c1146312359b43974e4b72c26d53506",
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
        "puzzleHash": "4e092605feea23c59789f6a9e8345157e241f675523d07614c7512f554ade73b"
      },
      {
        "pairId": "killer:nightmare:2",
        "verdict": "identity-failed",
        "problems": [
          "native-w1 outcome error",
          "attempts-w4 outcome error"
        ],
        "unproven": [],
        "unverified": [],
        "digestsEqual": null,
        "differing": null,
        "nativeDigest": "0aa50b0bd457348d467c40ffb76808213a975776c3244eef8cd25c76d785c3ee",
        "pooledDigest": "0aa50b0bd457348d467c40ffb76808213a975776c3244eef8cd25c76d785c3ee",
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
        "puzzleHash": "a8fc1719429a1c83d575dace65473bcac17c47e5d1a72ab5c101b2a77eab1cd4"
      },
      {
        "pairId": "killer:nightmare:3",
        "verdict": "identity-failed",
        "problems": [
          "native-w1 outcome error",
          "attempts-w4 outcome error"
        ],
        "unproven": [],
        "unverified": [],
        "digestsEqual": null,
        "differing": null,
        "nativeDigest": "2c38999202a0010d9bce1d172af1074aae83c2727736c0f1100fdc1f59dfa191",
        "pooledDigest": "2c38999202a0010d9bce1d172af1074aae83c2727736c0f1100fdc1f59dfa191",
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
        "puzzleHash": "e21169d335afd1a76cb75a1ccee1e9ab6fb3acca7f788c16dadc650667cf0a6f"
      }
    ],
    "failed": 3,
    "ok": 0,
    "notComparable": 0,
    "deferred": 0,
    "complete": false
  },
  "pairs": [
    {
      "pairId": "killer:nightmare:1",
      "cell": "killer",
      "seed": 1,
      "firstArm": "native-w1",
      "bothComplete": false,
      "native": {
        "outcome": "error",
        "timeoutScope": null,
        "readyWallMs": 18004.2836,
        "coldWallMs": 18091.556,
        "occupiedWallMs": 18097.696500000002,
        "cpuTotalMs": 19297,
        "cpuToDecisionMs": 19281,
        "cpuResolutionStatus": "resolved",
        "startupMs": 87.27239999999995,
        "cleanupMs": 6.140500000001339,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "failed",
        "attemptsUsed": 8,
        "attemptsPlanned": 8,
        "puzzleHash": "4e092605feea23c59789f6a9e8345157e241f675523d07614c7512f554ade73b",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": null
      },
      "pooled": {
        "outcome": "error",
        "timeoutScope": null,
        "readyWallMs": 7064.4895,
        "coldWallMs": 7175.334500000001,
        "occupiedWallMs": 7196.5891999999985,
        "cpuTotalMs": 23452,
        "cpuToDecisionMs": 23437,
        "cpuResolutionStatus": "resolved",
        "startupMs": 110.84500000000116,
        "cleanupMs": 21.254699999997683,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "failed",
        "attemptsUsed": 8,
        "attemptsPlanned": 8,
        "puzzleHash": "4e092605feea23c59789f6a9e8345157e241f675523d07614c7512f554ade73b",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 4,
          "peakActive": 4,
          "meanBusyLanes": 2.822,
          "attemptsStarted": 8,
          "attemptsConsumed": 8,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 110.845,
          "allReadyMs": 117.374,
          "duplicatedModelBuildMs": 5.765,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": null,
      "coldSpeedup": null,
      "occupiedSpeedup": null,
      "cpuRatio": null,
      "identity": "identity-failed"
    },
    {
      "pairId": "killer:nightmare:2",
      "cell": "killer",
      "seed": 2,
      "firstArm": "attempts-w4",
      "bothComplete": false,
      "native": {
        "outcome": "error",
        "timeoutScope": null,
        "readyWallMs": 30444.4767,
        "coldWallMs": 30527.637800000004,
        "occupiedWallMs": 30540.119599999998,
        "cpuTotalMs": 31454,
        "cpuToDecisionMs": 31438,
        "cpuResolutionStatus": "resolved",
        "startupMs": 83.16110000000481,
        "cleanupMs": 12.48179999999411,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "failed",
        "attemptsUsed": 8,
        "attemptsPlanned": 8,
        "puzzleHash": "a8fc1719429a1c83d575dace65473bcac17c47e5d1a72ab5c101b2a77eab1cd4",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": null
      },
      "pooled": {
        "outcome": "error",
        "timeoutScope": null,
        "readyWallMs": 14729.158799999997,
        "coldWallMs": 14841.820399999997,
        "occupiedWallMs": 14857.296199999997,
        "cpuTotalMs": 35297,
        "cpuToDecisionMs": 35266,
        "cpuResolutionStatus": "resolved",
        "startupMs": 112.66159999999945,
        "cleanupMs": 15.475800000000163,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "failed",
        "attemptsUsed": 8,
        "attemptsPlanned": 8,
        "puzzleHash": "a8fc1719429a1c83d575dace65473bcac17c47e5d1a72ab5c101b2a77eab1cd4",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 4,
          "peakActive": 4,
          "meanBusyLanes": 2.187,
          "attemptsStarted": 8,
          "attemptsConsumed": 8,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 112.662,
          "allReadyMs": 120.293,
          "duplicatedModelBuildMs": 6.875,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": null,
      "coldSpeedup": null,
      "occupiedSpeedup": null,
      "cpuRatio": null,
      "identity": "identity-failed"
    },
    {
      "pairId": "killer:nightmare:3",
      "cell": "killer",
      "seed": 3,
      "firstArm": "native-w1",
      "bothComplete": false,
      "native": {
        "outcome": "error",
        "timeoutScope": null,
        "readyWallMs": 21114.450500000006,
        "coldWallMs": 21200.215200000006,
        "occupiedWallMs": 21218.6909,
        "cpuTotalMs": 22157,
        "cpuToDecisionMs": 22064,
        "cpuResolutionStatus": "resolved",
        "startupMs": 85.76469999999972,
        "cleanupMs": 18.475699999995413,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "failed",
        "attemptsUsed": 8,
        "attemptsPlanned": 8,
        "puzzleHash": "e21169d335afd1a76cb75a1ccee1e9ab6fb3acca7f788c16dadc650667cf0a6f",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": null
      },
      "pooled": {
        "outcome": "error",
        "timeoutScope": null,
        "readyWallMs": 7972.1235000000015,
        "coldWallMs": 8080.738200000007,
        "occupiedWallMs": 8097.605100000001,
        "cpuTotalMs": 25234,
        "cpuToDecisionMs": 25187,
        "cpuResolutionStatus": "resolved",
        "startupMs": 108.61470000000554,
        "cleanupMs": 16.86689999999362,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "failed",
        "attemptsUsed": 8,
        "attemptsPlanned": 8,
        "puzzleHash": "e21169d335afd1a76cb75a1ccee1e9ab6fb3acca7f788c16dadc650667cf0a6f",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 4,
          "peakActive": 4,
          "meanBusyLanes": 2.727,
          "attemptsStarted": 8,
          "attemptsConsumed": 8,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 108.615,
          "allReadyMs": 110.327,
          "duplicatedModelBuildMs": 5.837,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": null,
      "coldSpeedup": null,
      "occupiedSpeedup": null,
      "cpuRatio": null,
      "identity": "identity-failed"
    }
  ],
  "cells": [
    {
      "cell": "killer",
      "attemptsPlanned": 8,
      "pairs": 3,
      "completePairs": 0,
      "identity": {
        "ok": 0,
        "failed": 3,
        "notComparable": 0,
        "deferred": 0
      },
      "native": {
        "requests": 3,
        "complete": 0,
        "censored": 0,
        "errors": 3,
        "validationUnknown": 0,
        "verifiedExact": 0,
        "readyWallS": {
          "n": 0,
          "p50": null,
          "p95": null,
          "max": null,
          "upperMedian": null,
          "note": null
        },
        "coldWallS": {
          "n": 0,
          "p50": null,
          "p95": null,
          "max": null,
          "upperMedian": null,
          "note": null
        },
        "cpuTotalS": {
          "n": 0,
          "p50": null,
          "p95": null,
          "max": null,
          "upperMedian": null,
          "note": null
        }
      },
      "pooled": {
        "requests": 3,
        "complete": 0,
        "censored": 0,
        "errors": 3,
        "validationUnknown": 0,
        "verifiedExact": 0,
        "readyWallS": {
          "n": 0,
          "p50": null,
          "p95": null,
          "max": null,
          "upperMedian": null,
          "note": null
        },
        "coldWallS": {
          "n": 0,
          "p50": null,
          "p95": null,
          "max": null,
          "upperMedian": null,
          "note": null
        },
        "cpuTotalS": {
          "n": 0,
          "p50": null,
          "p95": null,
          "max": null,
          "upperMedian": null,
          "note": null
        }
      },
      "readySpeedup": {
        "n": 0,
        "p50": null,
        "p95": null,
        "max": null,
        "upperMedian": null,
        "note": null
      },
      "readySpeedupMin": null,
      "coldSpeedup": {
        "n": 0,
        "p50": null,
        "p95": null,
        "max": null,
        "upperMedian": null,
        "note": null
      },
      "cpuRatio": {
        "n": 0,
        "p50": null,
        "p95": null,
        "max": null,
        "upperMedian": null,
        "note": null
      },
      "pool": {
        "width": 4,
        "peakActive": 0,
        "meanBusyLanes": {
          "n": 0,
          "p50": null,
          "p95": null,
          "max": null,
          "upperMedian": null,
          "note": null
        },
        "attemptsConsumed": [],
        "attemptsStarted": [],
        "speculativeCompleted": 0,
        "firstExactOrigins": [],
        "firstExactOrdinals": [],
        "duplicatedModelBuildMs": []
      },
      "above120s": {
        "native": 0,
        "pooled": 0
      },
      "report": {
        "attempts": 8,
        "today": [
          17.8,
          30
        ],
        "s5a": [
          2.8,
          3
        ],
        "afterFirstPhases": [
          4.5,
          9.8
        ]
      },
      "verdict": "inconclusive: fewer than two uncensored, resolved pairs",
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
      "IG-S02/killer/killer:nightmare:1/native-w1",
      "IG-S02/killer/killer:nightmare:1/attempts-w4",
      "IG-S02/killer/killer:nightmare:2/attempts-w4",
      "IG-S02/killer/killer:nightmare:2/native-w1",
      "IG-S02/killer/killer:nightmare:3/native-w1",
      "IG-S02/killer/killer:nightmare:3/attempts-w4"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  },
  "catalogueProbe": {
    "wallMs": 101.36939999999993,
    "cpuMs": 157,
    "note": "unmeasured: loads the engine once per command so neither arm carries the catalogue discovery"
  },
  "syntheticPoolTests": null
}
```
