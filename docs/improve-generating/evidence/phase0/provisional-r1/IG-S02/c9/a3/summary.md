# IG-S02 / c9 (provisional-r1, a3)

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
| classic9:nightmare:1 | 4982.035 | 5071.691 | 5641 | 1549.605 | 1666.851 | 8187 | 1.451 | 0.311 | 0.329 |
| classic9:nightmare:2 | 654.948 | 739.332 | 1046 | 717.015 | 836.227 | 4593 | 4.391 | 1.095 | 1.131 |
| classic9:nightmare:3 | 5644.893 | 5728.149 | 6094 | 1737.084 | 1858.326 | 8531 | 1.400 | 0.308 | 0.324 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 3 | 4982.035 | 5644.893 | 5644.893 | 4982.035 |
| cold wall ms | 3 | 5071.691 | 5728.149 | 5728.149 | 5071.691 |
| cpu total ms | 3 | 5641 | 6094 | 6094 | 5641 |

Requests 3, complete 3, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 1; per CPU second 0.078 (all spent CPU 12781 ms, resolved); per cold wall second 0.087 (all spent wall 11556.508 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 3 | 12781 | 11556.508 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 12781 | 11556.508 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 3 | 1549.605 | 1737.084 | 1737.084 | 1549.605 |
| cold wall ms | 3 | 1666.851 | 1858.326 | 1858.326 | 1666.851 |
| cpu total ms | 3 | 8187 | 8531 | 8531 | 8187 |

Requests 3, complete 3, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 1; per CPU second 0.047 (all spent CPU 21311 ms, resolved); per cold wall second 0.228 (all spent wall 4387.651 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 3 | 21311 | 4387.651 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 21311 | 4387.651 |

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
        "pairId": "classic9:nightmare:1",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "ef4fe4477e17601ede46f08024353faed819ced8d6a85a315a5d63577b1609ec",
        "pooledDigest": "ef4fe4477e17601ede46f08024353faed819ced8d6a85a315a5d63577b1609ec",
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
        "puzzleHash": "9667bc7b9b8e771acb4c2ff056f1aa76ac0bc054054a6a5b691800c6efdd38c1"
      },
      {
        "pairId": "classic9:nightmare:2",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "e8f3ebe2ab9eb99b5e118813728d922512645066f38dec36968b41ffbc2aced3",
        "pooledDigest": "e8f3ebe2ab9eb99b5e118813728d922512645066f38dec36968b41ffbc2aced3",
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
        "puzzleHash": "1701c0ee3bb8dc23245541f235b95384045bfd539e299480660f360eab945f45"
      },
      {
        "pairId": "classic9:nightmare:3",
        "verdict": "identity-ok",
        "problems": [],
        "unproven": [],
        "unverified": [],
        "digestsEqual": true,
        "differing": [],
        "nativeDigest": "48a2dddbebec707b86a85a349352e08efd710f836c0d6a95aa0444b8f9ab9d49",
        "pooledDigest": "48a2dddbebec707b86a85a349352e08efd710f836c0d6a95aa0444b8f9ab9d49",
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
        "puzzleHash": "bf9e4ae7ba99b8f7312c31d43c85a282c966f691730fe75d5c0f25d665f4fb93"
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
      "pairId": "classic9:nightmare:1",
      "cell": "classic9",
      "seed": 1,
      "firstArm": "native-w1",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 4982.0347,
        "coldWallMs": 5071.6915,
        "occupiedWallMs": 5077.7224,
        "cpuTotalMs": 5641,
        "cpuToDecisionMs": 5641,
        "cpuResolutionStatus": "resolved",
        "startupMs": 89.65679999999998,
        "cleanupMs": 6.030899999999747,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 8,
        "attemptsPlanned": 8,
        "puzzleHash": "9667bc7b9b8e771acb4c2ff056f1aa76ac0bc054054a6a5b691800c6efdd38c1",
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
        "readyWallMs": 1549.6050999999989,
        "coldWallMs": 1666.8513999999986,
        "occupiedWallMs": 1674.8162000000002,
        "cpuTotalMs": 8187,
        "cpuToDecisionMs": 8171,
        "cpuResolutionStatus": "resolved",
        "startupMs": 117.24629999999979,
        "cleanupMs": 7.96480000000156,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 8,
        "attemptsPlanned": 8,
        "puzzleHash": "9667bc7b9b8e771acb4c2ff056f1aa76ac0bc054054a6a5b691800c6efdd38c1",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 4,
          "peakActive": 4,
          "meanBusyLanes": 3.524,
          "attemptsStarted": 8,
          "attemptsConsumed": 8,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 117.246,
          "allReadyMs": 122.268,
          "duplicatedModelBuildMs": 7.375,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": 3.215035043444297,
      "coldSpeedup": 3.0426776496093195,
      "occupiedSpeedup": 3.031808744147566,
      "cpuRatio": 1.4513384151746145,
      "identity": "identity-ok"
    },
    {
      "pairId": "classic9:nightmare:2",
      "cell": "classic9",
      "seed": 2,
      "firstArm": "attempts-w4",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 654.9475000000002,
        "coldWallMs": 739.3319999999985,
        "occupiedWallMs": 743.973,
        "cpuTotalMs": 1046,
        "cpuToDecisionMs": 984,
        "cpuResolutionStatus": "resolved",
        "startupMs": 84.3844999999983,
        "cleanupMs": 4.641000000001441,
        "claimedExact": true,
        "verifiedExact": true,
        "validation": "verified",
        "attemptsUsed": 1,
        "attemptsPlanned": 8,
        "puzzleHash": "1701c0ee3bb8dc23245541f235b95384045bfd539e299480660f360eab945f45",
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
        "readyWallMs": 717.0146000000004,
        "coldWallMs": 836.2271000000001,
        "occupiedWallMs": 847.453300000001,
        "cpuTotalMs": 4593,
        "cpuToDecisionMs": 4484,
        "cpuResolutionStatus": "resolved",
        "startupMs": 119.21249999999964,
        "cleanupMs": 11.226200000000972,
        "claimedExact": true,
        "verifiedExact": true,
        "validation": "verified",
        "attemptsUsed": 1,
        "attemptsPlanned": 8,
        "puzzleHash": "1701c0ee3bb8dc23245541f235b95384045bfd539e299480660f360eab945f45",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 4,
          "peakActive": 4,
          "meanBusyLanes": 3.419,
          "attemptsStarted": 5,
          "attemptsConsumed": 1,
          "attemptsSpeculative": 4,
          "firstExactOrigin": "keeper",
          "firstExactOrdinal": 1,
          "resultOrigin": "keeper",
          "firstReadyMs": 119.212,
          "allReadyMs": 123.634,
          "duplicatedModelBuildMs": 1.514,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 1
        }
      },
      "readySpeedup": 0.9134367696278428,
      "coldSpeedup": 0.8841282469797959,
      "occupiedSpeedup": 0.8778926225197294,
      "cpuRatio": 4.391013384321224,
      "identity": "identity-ok"
    },
    {
      "pairId": "classic9:nightmare:3",
      "cell": "classic9",
      "seed": 3,
      "firstArm": "native-w1",
      "bothComplete": true,
      "native": {
        "outcome": "complete",
        "timeoutScope": null,
        "readyWallMs": 5644.892900000001,
        "coldWallMs": 5728.148500000001,
        "occupiedWallMs": 5734.8128000000015,
        "cpuTotalMs": 6094,
        "cpuToDecisionMs": 6078,
        "cpuResolutionStatus": "resolved",
        "startupMs": 83.25560000000041,
        "cleanupMs": 6.664300000000367,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 8,
        "attemptsPlanned": 8,
        "puzzleHash": "bf9e4ae7ba99b8f7312c31d43c85a282c966f691730fe75d5c0f25d665f4fb93",
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
        "readyWallMs": 1737.0843999999997,
        "coldWallMs": 1858.3257999999987,
        "occupiedWallMs": 1865.381699999998,
        "cpuTotalMs": 8531,
        "cpuToDecisionMs": 8515,
        "cpuResolutionStatus": "resolved",
        "startupMs": 121.24139999999898,
        "cleanupMs": 7.055899999999383,
        "claimedExact": false,
        "verifiedExact": false,
        "validation": "verified",
        "attemptsUsed": 8,
        "attemptsPlanned": 8,
        "puzzleHash": "bf9e4ae7ba99b8f7312c31d43c85a282c966f691730fe75d5c0f25d665f4fb93",
        "above120s": {
          "readyWall": false,
          "coldWall": false,
          "note": "recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard"
        },
        "pool": {
          "width": 4,
          "peakActive": 4,
          "meanBusyLanes": 3.4,
          "attemptsStarted": 8,
          "attemptsConsumed": 8,
          "attemptsSpeculative": 0,
          "firstExactOrigin": null,
          "firstExactOrdinal": null,
          "resultOrigin": "sample",
          "firstReadyMs": 121.241,
          "allReadyMs": 124.812,
          "duplicatedModelBuildMs": 8.81,
          "modelHashesEqual": true,
          "keeperUnsoundConsumed": false,
          "speculativeCompleted": 0
        }
      },
      "readySpeedup": 3.2496365173735953,
      "coldSpeedup": 3.0824242444462673,
      "occupiedSpeedup": 3.0743374398923327,
      "cpuRatio": 1.3999015425008206,
      "identity": "identity-ok"
    }
  ],
  "cells": [
    {
      "cell": "classic9",
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
        "verifiedExact": 1,
        "readyWallS": {
          "n": 3,
          "p50": 4.98,
          "p95": 5.64,
          "max": 5.64,
          "upperMedian": 4.98,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 3,
          "p50": 5.07,
          "p95": 5.73,
          "max": 5.73,
          "upperMedian": 5.07,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 3,
          "p50": 5.64,
          "p95": 6.09,
          "max": 6.09,
          "upperMedian": 5.64,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        }
      },
      "pooled": {
        "requests": 3,
        "complete": 3,
        "censored": 0,
        "errors": 0,
        "validationUnknown": 0,
        "verifiedExact": 1,
        "readyWallS": {
          "n": 3,
          "p50": 1.55,
          "p95": 1.74,
          "max": 1.74,
          "upperMedian": 1.55,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "coldWallS": {
          "n": 3,
          "p50": 1.67,
          "p95": 1.86,
          "max": 1.86,
          "upperMedian": 1.67,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "cpuTotalS": {
          "n": 3,
          "p50": 8.19,
          "p95": 8.53,
          "max": 8.53,
          "upperMedian": 8.19,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        }
      },
      "readySpeedup": {
        "n": 3,
        "p50": 3.215035043444297,
        "p95": 3.2496365173735953,
        "max": 3.2496365173735953,
        "upperMedian": 3.215035043444297,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "readySpeedupMin": 0.9134367696278428,
      "coldSpeedup": {
        "n": 3,
        "p50": 3.0426776496093195,
        "p95": 3.0824242444462673,
        "max": 3.0824242444462673,
        "upperMedian": 3.0426776496093195,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "cpuRatio": {
        "n": 3,
        "p50": 1.4513384151746145,
        "p95": 4.391013384321224,
        "max": 4.391013384321224,
        "upperMedian": 1.4513384151746145,
        "note": "p95 is the observed maximum, not a production-tail estimate"
      },
      "pool": {
        "width": 4,
        "peakActive": 4,
        "meanBusyLanes": {
          "n": 3,
          "p50": 3.419,
          "p95": 3.524,
          "max": 3.524,
          "upperMedian": 3.419,
          "note": "p95 is the observed maximum, not a production-tail estimate"
        },
        "attemptsConsumed": [
          8,
          1,
          8
        ],
        "attemptsStarted": [
          8,
          5,
          8
        ],
        "speculativeCompleted": 1,
        "firstExactOrigins": [
          null,
          "keeper",
          null
        ],
        "firstExactOrdinals": [
          null,
          1,
          null
        ],
        "duplicatedModelBuildMs": [
          7.375,
          1.514,
          8.81
        ]
      },
      "above120s": {
        "native": 0,
        "pooled": 0
      },
      "report": {
        "attempts": 8,
        "today": [
          4.91,
          5.72
        ],
        "s5a": [
          2.8,
          3
        ],
        "afterFirstPhases": [
          1.17,
          1.7
        ]
      },
      "verdict": "estimate-supported (median ready-wall speed-up >= 2.8)",
      "verdictNote": "descriptive, n = 3 pairs; with n2/n3 the p95 is the observed maximum; provisional (pre-freeze); no availability, default or qualification decision follows"
    }
  ],
  "chain": {
    "attempts": [
      "a3"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S02/c9/classic9:nightmare:1/native-w1",
      "IG-S02/c9/classic9:nightmare:1/attempts-w4",
      "IG-S02/c9/classic9:nightmare:2/attempts-w4",
      "IG-S02/c9/classic9:nightmare:2/native-w1",
      "IG-S02/c9/classic9:nightmare:3/native-w1",
      "IG-S02/c9/classic9:nightmare:3/attempts-w4"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  },
  "catalogueProbe": {
    "wallMs": 103.59480000000002,
    "cpuMs": 126,
    "note": "unmeasured: loads the engine once per command so neither arm carries the catalogue discovery"
  },
  "syntheticPoolTests": {
    "ok": true,
    "passed": 21,
    "total": 21,
    "results": [
      {
        "id": "merge-equals-the-serial-loop-on-random-scenarios",
        "group": "pure",
        "ok": true,
        "ms": 26.8,
        "title": "the keeper replay and the ordered merge equal the one-keeper serial loop (ties, unknown counts, unsound offers)",
        "detail": {
          "scenarios": 1500,
          "rated": 1500,
          "exactStops": 1406,
          "unsoundRuns": 435
        }
      },
      {
        "id": "merge-precedence-and-ties",
        "group": "pure",
        "ok": true,
        "ms": 0.6,
        "title": "equal-quality candidates keep the first met; the keeper and the search need a strictly better quality",
        "detail": null
      },
      {
        "id": "merge-hook-exact-and-first-sample",
        "group": "pure",
        "ok": true,
        "ms": 0.1,
        "title": "an exact hook candidate still lets the first sample run: the sample wins a tie, the keeper beats a shallow sample",
        "detail": null
      },
      {
        "id": "merge-incomplete-proofs-and-counts",
        "group": "pure",
        "ok": true,
        "ms": 0.2,
        "title": "an incomplete proof cannot win, an unknown count is never kept, a speculative count above the threshold is no unsound",
        "detail": null
      },
      {
        "id": "merge-refuses-unexplained-differences",
        "group": "pure",
        "ok": true,
        "ms": 0.5,
        "title": "an out-of-order attempt, a different configuration or an unexplained keeper replay is a correctness stop",
        "detail": null
      },
      {
        "id": "pool-reversed-completion-and-earlier-exact",
        "group": "pure",
        "ok": true,
        "ms": 78.2,
        "title": "attempts that complete in reverse order are consumed in native order; a later exact result stays speculative",
        "detail": null
      },
      {
        "id": "pool-first-exact-at-attempt-1-and-3-and-ceiling",
        "group": "pure",
        "ok": true,
        "ms": 46.7,
        "title": "the earliest exact boundary decides; at most min(4, A) attempts are active; later work never counts",
        "detail": null
      },
      {
        "id": "pool-late-reply-and-speculative-warning",
        "group": "pure",
        "ok": true,
        "ms": 15.6,
        "title": "a reply after the decision is seen but never consumed and leaks no warning or work into the result",
        "detail": null
      },
      {
        "id": "pool-errors-and-cleanup",
        "group": "pure",
        "ok": true,
        "ms": 94.8,
        "title": "a consumed worker error is the request error; an unconsumed one is ignored; an unterminated worker is reported",
        "detail": null
      },
      {
        "id": "pool-timeout-keeps-cpu-and-never-a-hit",
        "group": "pure",
        "ok": true,
        "ms": 48.1,
        "title": "a request that does not decide before the guard is a timeout with its wall and CPU, not a result",
        "detail": null
      },
      {
        "id": "pool-merge-stop-and-lost-worker",
        "group": "pure",
        "ok": true,
        "ms": 31.4,
        "title": "an unexplained merge difference stops the request as an identity violation; a lost worker is an attempt error",
        "detail": null
      },
      {
        "id": "identity-of-a-pair",
        "group": "pure",
        "ok": true,
        "ms": 1.7,
        "title": "native-w1 and attempts-w4 must agree on every digest section; censored arms prove nothing",
        "detail": null
      },
      {
        "id": "plan-population-and-arm-order",
        "group": "pure",
        "ok": true,
        "ms": 1.1,
        "title": "eight shards, eighteen pairs, 36 keys; the arm order alternates by seed index; both arms get the same request",
        "detail": null
      },
      {
        "id": "adapter-transforms-apply-to-the-real-source",
        "group": "pure",
        "ok": true,
        "ms": 42.4,
        "title": "the five attempt-pool transforms apply once each to the real digger source in memory and compile; nothing is written",
        "detail": null
      },
      {
        "id": "loader-replace-transform-is-strict",
        "group": "pure",
        "ok": true,
        "ms": 0.9,
        "title": "a replace transform needs one unique single-line find inside the anchored function and fails closed otherwise",
        "detail": null
      },
      {
        "id": "record-and-summary-of-a-pooled-request",
        "group": "pure",
        "ok": true,
        "ms": 26.8,
        "title": "a pooled and a native request become well-formed records, a saved puzzle, a shard summary and the task summary",
        "detail": null
      },
      {
        "id": "worker-capture-keeps-the-parts-apart",
        "group": "pure",
        "ok": true,
        "ms": 1.8,
        "title": "capture keeps the first-best sample, the search state and the keeper with its ledger separately, per attempt",
        "detail": null
      },
      {
        "id": "threads-reversed-completion",
        "group": "worker",
        "ok": true,
        "ms": 187.3,
        "title": "real workers finishing in reverse order are consumed in native order and the speculative one never counts",
        "detail": {
          "coldWallMs": 183.6377,
          "cpuTotalMs": 328,
          "decisionMs": 183.638,
          "firstReadyMs": 21.375,
          "allReadyMs": 21.792,
          "peakActive": 3
        }
      },
      {
        "id": "threads-speculation-is-terminated-and-counted",
        "group": "worker",
        "ok": true,
        "ms": 148.7,
        "title": "busy speculative workers are terminated at the decision and their CPU is in the request total, counted once",
        "detail": {
          "coldWallMs": 144.42010000000005,
          "cpuToDecisionMs": 563,
          "cpuTotalMs": 625,
          "cleanupMs": 4.011300000000119,
          "peakActive": 4
        }
      },
      {
        "id": "threads-error-and-two-attempt-ceiling",
        "group": "worker",
        "ok": true,
        "ms": 43.9,
        "title": "a consumed worker error ends the request; two attempts use two lanes, never four",
        "detail": {
          "peakActive": 2
        }
      },
      {
        "id": "threads-request-timeout",
        "group": "worker",
        "ok": true,
        "ms": 307.2,
        "title": "a short test-only timer ends a request of busy workers with its CPU, no result",
        "detail": {
          "coldWallMs": 304.7591,
          "cpuToDecisionMs": 640,
          "cpuTotalMs": 640
        }
      }
    ]
  }
}
```
