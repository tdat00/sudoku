# IG-S02 / m16-3 (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: provisional; the S5a estimate is judged on the task summary across all six cells.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 2 | 2 | 0 | 0 | 0 | true |

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
| mega16:nightmare:3 | 107525.019 | 107614.849 | 107547 | 55894.198 | 55998.629 | 105750 | 0.983 | 0.520 | 0.520 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 107525.019 | 107525.019 | 107525.019 | 107525.019 |
| cold wall ms | 1 | 107614.849 | 107614.849 | 107614.849 | 107614.849 |
| cpu total ms | 1 | 107547 | 107547 | 107547 | 107547 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 107547 ms, resolved); per cold wall second 0 (all spent wall 107619.836 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 107547 | 107619.836 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 107547 | 107619.836 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 55894.198 | 55894.198 | 55894.198 | 55894.198 |
| cold wall ms | 1 | 55998.629 | 55998.629 | 55998.629 | 55998.629 |
| cpu total ms | 1 | 105750 | 105750 | 105750 | 105750 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 105750 ms, resolved); per cold wall second 0 (all spent wall 56004.498 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 105750 | 56004.498 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 105750 | 56004.498 |

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
        "pairId": "mega16:nightmare:3",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "969eb86ca7b4705c1fd99bf9194818c41153f8e49d4a2b90babca56169ad8d19",
        "pooledDigest": "969eb86ca7b4705c1fd99bf9194818c41153f8e49d4a2b90babca56169ad8d19",
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
        "puzzleHash": "baeff12be70797abc8393e4b5641ab843d5f919f82af8d3eea937b0ca28eade7"
      }
    ],
    "failed": 0,
    "ok": 1,
    "notComparable": 0,
    "deferred": 0,
    "complete": true
  },
  "pairs": [
    {
      "pairId": "mega16:nightmare:3",
      "cell": "mega16",
      "seed": 3,
      "firstArm": "native-w1",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 107525.0186,
        "coldWallMs": 107614.8488,
        "occupiedWallMs": 107619.83570000001,
        "cpuTotalMs": 107547,
        "cpuToDecisionMs": 107547,
        "cpuResolutionStatus": "resolved",
        "startupMs": 89.83019999999999,
        "cleanupMs": 4.986900000003516,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 2,
        "attemptsPlanned": 2,
        "puzzleHash": "baeff12be70797abc8393e4b5641ab843d5f919f82af8d3eea937b0ca28eade7",
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
        "readyWallMs": 55894.19810000001,
        "coldWallMs": 55998.628700000016,
        "occupiedWallMs": 56004.49750000001,
        "cpuTotalMs": 105750,
        "cpuToDecisionMs": 105750,
        "cpuResolutionStatus": "resolved",
        "startupMs": 104.43060000000696,
        "cleanupMs": 5.868799999996554,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 2,
        "attemptsPlanned": 2,
        "puzzleHash": "baeff12be70797abc8393e4b5641ab843d5f919f82af8d3eea937b0ca28eade7",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 2,
          "peakActive": 2,
          "meanBusyLanes": 1.879,
          "attemptsStarted": 2,
          "attemptsConsumed": 2,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 104.431,
          "allReadyMs": 104.858,
          "duplicatedModelBuildMs": 2.574,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": 1.9237241476767868,
      "coldSpeedup": 1.9217407871989547,
      "occupiedSpeedup": 1.9216284495722864,
      "cpuRatio": 0.9832910262489888,
      "identity": "identity-ok"
    }
  ],
  "cells": [
    {
      "cell": "mega16",
      "attemptsPlanned": 2,
      "pairs": 1,
      "completePairs": 1,
      "identity": {
        "ok": 1,
        "failed": 0,
        "notComparable": 0,
        "deferred": 0
      },
      "native": {
        "requests": 1,
        "complete": 1,
        "censored": 0,
        "errors": 0,
        "validationUnknown": 0,
        "verifiedExact": 0,
        "readyWallS": {
          "n": 1,
          "p50": 107.53,
          "p95": 107.53,
          "max": 107.53,
          "upperMedian": 107.53,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 1,
          "p50": 107.61,
          "p95": 107.61,
          "max": 107.61,
          "upperMedian": 107.61,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 1,
          "p50": 107.55,
          "p95": 107.55,
          "max": 107.55,
          "upperMedian": 107.55,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        }
      },
      "pooled": {
        "requests": 1,
        "complete": 1,
        "censored": 0,
        "errors": 0,
        "validationUnknown": 0,
        "verifiedExact": 0,
        "readyWallS": {
          "n": 1,
          "p50": 55.89,
          "p95": 55.89,
          "max": 55.89,
          "upperMedian": 55.89,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 1,
          "p50": 56,
          "p95": 56,
          "max": 56,
          "upperMedian": 56,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 1,
          "p50": 105.75,
          "p95": 105.75,
          "max": 105.75,
          "upperMedian": 105.75,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        }
      },
      "readySpeedup": {
        "n": 1,
        "p50": 1.9237241476767868,
        "p95": 1.9237241476767868,
        "max": 1.9237241476767868,
        "upperMedian": 1.9237241476767868,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "readySpeedupMin": 1.9237241476767868,
      "coldSpeedup": {
        "n": 1,
        "p50": 1.9217407871989547,
        "p95": 1.9217407871989547,
        "max": 1.9217407871989547,
        "upperMedian": 1.9217407871989547,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "cpuRatio": {
        "n": 1,
        "p50": 0.9832910262489888,
        "p95": 0.9832910262489888,
        "max": 0.9832910262489888,
        "upperMedian": 0.9832910262489888,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "pool": {
        "width": 2,
        "peakActive": 2,
        "meanBusyLanes": {
          "n": 1,
          "p50": 1.879,
          "p95": 1.879,
          "max": 1.879,
          "upperMedian": 1.879,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "attemptsConsumed": [
          2
        ],
        "attemptsStarted": [
          2
        ],
        "speculativeCompleted": 0,
        "firstExactOrigins": [
          null
        ],
        "firstExactOrdinals": [
          null
        ],
        "duplicatedModelBuildMs": [
          2.574
        ]
      },
      "above120s": {
        "native": 0,
        "pooled": 0
      },
      "report": {
        "attempts": 2,
        "today": [
          104.1,
          117
        ],
        "s5a": [
          1.7,
          1.8
        ],
        "afterFirstPhases": [
          39,
          50
        ]
      },
      "verdict": "inconclusive: fewer than two uncensored, resolved pairs",
      "verdictNote": "descriptive, n = 1 pairs; with n2/n3 the p95 is the observed maximum; provisional (pre-freeze); no availability, default or qualification decision follows"
    }
  ],
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S02/m16-3/mega16:nightmare:3/native-w1",
      "IG-S02/m16-3/mega16:nightmare:3/attempts-w4"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  },
  "catalogueProbe": {
    "wallMs": 123.30260000000004,
    "cpuMs": 95,
    "note": "unmeasured: loads the engine once per command so neither arm carries the catalogue discovery"
  },
  "syntheticPoolTests": null
}
```
