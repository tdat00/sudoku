# IG-S02 / m16-1 (provisional-r1, a1)

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
| mega16:nightmare:1 | 116041.108 | 116132.049 | 116188 | 69960.871 | 70066.207 | 115219 | 0.992 | 0.603 | 0.603 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 116041.108 | 116041.108 | 116041.108 | 116041.108 |
| cold wall ms | 1 | 116132.049 | 116132.049 | 116132.049 | 116132.049 |
| cpu total ms | 1 | 116188 | 116188 | 116188 | 116188 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 116188 ms, resolved); per cold wall second 0 (all spent wall 116137.248 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 116188 | 116137.248 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 116188 | 116137.248 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 69960.871 | 69960.871 | 69960.871 | 69960.871 |
| cold wall ms | 1 | 70066.207 | 70066.207 | 70066.207 | 70066.207 |
| cpu total ms | 1 | 115219 | 115219 | 115219 | 115219 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 115219 ms, resolved); per cold wall second 0 (all spent wall 70072.271 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 115219 | 70072.271 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 115219 | 70072.271 |

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
        "pairId": "mega16:nightmare:1",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "e15e5b9a87cc1b1f473811b6bfac991e88ad08653d534292a780d9be4ca43559",
        "pooledDigest": "e15e5b9a87cc1b1f473811b6bfac991e88ad08653d534292a780d9be4ca43559",
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
        "puzzleHash": "2509df221d72b84e59f7d334d2dd2ea29572e1723490634a054a5e117d098be6"
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
      "pairId": "mega16:nightmare:1",
      "cell": "mega16",
      "seed": 1,
      "firstArm": "native-w1",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 116041.10789999999,
        "coldWallMs": 116132.04879999999,
        "occupiedWallMs": 116137.24829999999,
        "cpuTotalMs": 116188,
        "cpuToDecisionMs": 116188,
        "cpuResolutionStatus": "resolved",
        "startupMs": 90.94089999999994,
        "cleanupMs": 5.199500000002445,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 2,
        "attemptsPlanned": 2,
        "puzzleHash": "2509df221d72b84e59f7d334d2dd2ea29572e1723490634a054a5e117d098be6",
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
        "readyWallMs": 69960.87089999998,
        "coldWallMs": 70066.20659999999,
        "occupiedWallMs": 70072.2706,
        "cpuTotalMs": 115219,
        "cpuToDecisionMs": 115219,
        "cpuResolutionStatus": "resolved",
        "startupMs": 105.33570000001055,
        "cleanupMs": 6.0640000000130385,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 2,
        "attemptsPlanned": 2,
        "puzzleHash": "2509df221d72b84e59f7d334d2dd2ea29572e1723490634a054a5e117d098be6",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 2,
          "peakActive": 2,
          "meanBusyLanes": 1.64,
          "attemptsStarted": 2,
          "attemptsConsumed": 2,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 105.336,
          "allReadyMs": 105.807,
          "duplicatedModelBuildMs": 2.587,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": 1.6586572809516016,
      "coldSpeedup": 1.657461627157649,
      "occupiedSpeedup": 1.6573923936753376,
      "cpuRatio": 0.9916600681653871,
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
          "p50": 116.04,
          "p95": 116.04,
          "max": 116.04,
          "upperMedian": 116.04,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 1,
          "p50": 116.13,
          "p95": 116.13,
          "max": 116.13,
          "upperMedian": 116.13,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 1,
          "p50": 116.19,
          "p95": 116.19,
          "max": 116.19,
          "upperMedian": 116.19,
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
          "p50": 69.96,
          "p95": 69.96,
          "max": 69.96,
          "upperMedian": 69.96,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 1,
          "p50": 70.07,
          "p95": 70.07,
          "max": 70.07,
          "upperMedian": 70.07,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 1,
          "p50": 115.22,
          "p95": 115.22,
          "max": 115.22,
          "upperMedian": 115.22,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        }
      },
      "readySpeedup": {
        "n": 1,
        "p50": 1.6586572809516016,
        "p95": 1.6586572809516016,
        "max": 1.6586572809516016,
        "upperMedian": 1.6586572809516016,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "readySpeedupMin": 1.6586572809516016,
      "coldSpeedup": {
        "n": 1,
        "p50": 1.657461627157649,
        "p95": 1.657461627157649,
        "max": 1.657461627157649,
        "upperMedian": 1.657461627157649,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "cpuRatio": {
        "n": 1,
        "p50": 0.9916600681653871,
        "p95": 0.9916600681653871,
        "max": 0.9916600681653871,
        "upperMedian": 0.9916600681653871,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "pool": {
        "width": 2,
        "peakActive": 2,
        "meanBusyLanes": {
          "n": 1,
          "p50": 1.64,
          "p95": 1.64,
          "max": 1.64,
          "upperMedian": 1.64,
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
          2.587
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
      "IG-S02/m16-1/mega16:nightmare:1/native-w1",
      "IG-S02/m16-1/mega16:nightmare:1/attempts-w4"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  },
  "catalogueProbe": {
    "wallMs": 102.98569999999995,
    "cpuMs": 125,
    "note": "unmeasured: loads the engine once per command so neither arm carries the catalogue discovery"
  },
  "syntheticPoolTests": null
}
```
