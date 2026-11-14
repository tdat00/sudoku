# IG-S02 / m16-2 (provisional-r1, a1)

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
| mega16:nightmare:2 | 102686.071 | 102769.842 | 103032 | 52407.621 | 52512.970 | 101313 | 0.983 | 0.510 | 0.511 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 102686.071 | 102686.071 | 102686.071 | 102686.071 |
| cold wall ms | 1 | 102769.842 | 102769.842 | 102769.842 | 102769.842 |
| cpu total ms | 1 | 103032 | 103032 | 103032 | 103032 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 103032 ms, resolved); per cold wall second 0 (all spent wall 102776.021 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 103032 | 102776.021 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 103032 | 102776.021 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 52407.621 | 52407.621 | 52407.621 | 52407.621 |
| cold wall ms | 1 | 52512.970 | 52512.970 | 52512.970 | 52512.970 |
| cpu total ms | 1 | 101313 | 101313 | 101313 | 101313 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 101313 ms, resolved); per cold wall second 0 (all spent wall 52518.724 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 101313 | 52518.724 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 101313 | 52518.724 |

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
        "pairId": "mega16:nightmare:2",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "e86d509bfad1fface7431f32ec491db77aba8723a4fb575740931f6541297060",
        "pooledDigest": "e86d509bfad1fface7431f32ec491db77aba8723a4fb575740931f6541297060",
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
        "puzzleHash": "cc87297a51b08ef12f3da5b982af5e27ac2352443e3588ed0c39f0d6a56a826d"
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
      "pairId": "mega16:nightmare:2",
      "cell": "mega16",
      "seed": 2,
      "firstArm": "attempts-w4",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 102686.07100000001,
        "coldWallMs": 102769.842,
        "occupiedWallMs": 102776.02099999998,
        "cpuTotalMs": 103032,
        "cpuToDecisionMs": 102954,
        "cpuResolutionStatus": "resolved",
        "startupMs": 83.77100000000064,
        "cleanupMs": 6.1789999999746215,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 2,
        "attemptsPlanned": 2,
        "puzzleHash": "cc87297a51b08ef12f3da5b982af5e27ac2352443e3588ed0c39f0d6a56a826d",
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
        "readyWallMs": 52407.6214,
        "coldWallMs": 52512.9703,
        "occupiedWallMs": 52518.7239,
        "cpuTotalMs": 101313,
        "cpuToDecisionMs": 101281,
        "cpuResolutionStatus": "resolved",
        "startupMs": 105.34889999999996,
        "cleanupMs": 5.753599999996368,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 2,
        "attemptsPlanned": 2,
        "puzzleHash": "cc87297a51b08ef12f3da5b982af5e27ac2352443e3588ed0c39f0d6a56a826d",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 2,
          "peakActive": 2,
          "meanBusyLanes": 1.913,
          "attemptsStarted": 2,
          "attemptsConsumed": 2,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 105.349,
          "allReadyMs": 105.855,
          "duplicatedModelBuildMs": 2.558,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": 1.9593728594597122,
      "coldSpeedup": 1.9570373074097467,
      "occupiedSpeedup": 1.956940560773983,
      "cpuRatio": 0.9833158630328441,
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
          "p50": 102.69,
          "p95": 102.69,
          "max": 102.69,
          "upperMedian": 102.69,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 1,
          "p50": 102.77,
          "p95": 102.77,
          "max": 102.77,
          "upperMedian": 102.77,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 1,
          "p50": 103.03,
          "p95": 103.03,
          "max": 103.03,
          "upperMedian": 103.03,
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
          "p50": 52.41,
          "p95": 52.41,
          "max": 52.41,
          "upperMedian": 52.41,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 1,
          "p50": 52.51,
          "p95": 52.51,
          "max": 52.51,
          "upperMedian": 52.51,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 1,
          "p50": 101.31,
          "p95": 101.31,
          "max": 101.31,
          "upperMedian": 101.31,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        }
      },
      "readySpeedup": {
        "n": 1,
        "p50": 1.9593728594597122,
        "p95": 1.9593728594597122,
        "max": 1.9593728594597122,
        "upperMedian": 1.9593728594597122,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "readySpeedupMin": 1.9593728594597122,
      "coldSpeedup": {
        "n": 1,
        "p50": 1.9570373074097467,
        "p95": 1.9570373074097467,
        "max": 1.9570373074097467,
        "upperMedian": 1.9570373074097467,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "cpuRatio": {
        "n": 1,
        "p50": 0.9833158630328441,
        "p95": 0.9833158630328441,
        "max": 0.9833158630328441,
        "upperMedian": 0.9833158630328441,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "pool": {
        "width": 2,
        "peakActive": 2,
        "meanBusyLanes": {
          "n": 1,
          "p50": 1.913,
          "p95": 1.913,
          "max": 1.913,
          "upperMedian": 1.913,
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
          2.558
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
      "IG-S02/m16-2/mega16:nightmare:2/attempts-w4",
      "IG-S02/m16-2/mega16:nightmare:2/native-w1"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  },
  "catalogueProbe": {
    "wallMs": 102.78789999999998,
    "cpuMs": 109,
    "note": "unmeasured: loads the engine once per command so neither arm carries the catalogue discovery"
  },
  "syntheticPoolTests": null
}
```
