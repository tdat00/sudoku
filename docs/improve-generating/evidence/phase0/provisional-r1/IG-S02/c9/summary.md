# IG-S02 / c9 (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **error** (exit 1). Estimate verdict: provisional; the S5a estimate is judged on the task summary across all six cells.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 6 | 0 | 0 | 0 | 6 | false |

Exclusions: native-w1 and attempts-w4 share one request and the same default attempts; no override; the unmeasured catalogue probe and the independent audit are outside every generation time; a censored or unverified arm proves neither identity nor speed

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | 7cff39b1cce741ff9a3fdbddfacd327fd35bb8bbb3d2b147a2f39f62a89034b1 |
| adapters | attempt-pool |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Paired rows (before = reference, after = prototype)

| pair | ref ready ms | ref cold ms | ref cpu ms | proto ready ms | proto cold ms | proto cpu ms | cpu factor | ready factor | cold factor |
|---|---|---|---|---|---|---|---|---|---|
| classic9:nightmare:1 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| classic9:nightmare:2 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| classic9:nightmare:3 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 0 | n/a | n/a | n/a | n/a |
| cold wall ms | 0 | n/a | n/a | n/a | n/a |
| cpu total ms | 0 | n/a | n/a | n/a | n/a |

Requests 3, complete 0, censored 0, errors 0, validation unknown 0, unstarted 3. Verified hits 0; per CPU second n/a (all spent CPU 0 ms, unresolved); per cold wall second n/a (all spent wall 0 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 0 | 0 | 0 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 0 | 0 | 0 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 0 | n/a | n/a | n/a | n/a |
| cold wall ms | 0 | n/a | n/a | n/a | n/a |
| cpu total ms | 0 | n/a | n/a | n/a | n/a |

Requests 3, complete 0, censored 0, errors 0, validation unknown 0, unstarted 3. Verified hits 0; per CPU second n/a (all spent CPU 0 ms, unresolved); per cold wall second n/a (all spent wall 0 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 0 | 0 | 0 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 0 | 0 | 0 |

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
        "verdict": "not-started"
      },
      {
        "pairId": "classic9:nightmare:2",
        "verdict": "not-started"
      },
      {
        "pairId": "classic9:nightmare:3",
        "verdict": "not-started"
      }
    ],
    "failed": 0,
    "ok": 0,
    "notComparable": 0,
    "deferred": 3,
    "complete": false
  },
  "pairs": [
    {
      "pairId": "classic9:nightmare:1",
      "cell": "classic9",
      "seed": 1,
      "firstArm": "native-w1",
      "bothComplete": false,
      "native": {
        "outcome": "unstarted",
        "timeoutScope": null,
        "readyWallMs": null,
        "coldWallMs": null,
        "occupiedWallMs": null,
        "cpuTotalMs": null,
        "cpuToDecisionMs": null,
        "cpuResolutionStatus": null,
        "startupMs": null,
        "cleanupMs": null,
        "claimedExact": null,
        "verifiedExact": null,
        "validation": null,
        "attemptsUsed": null,
        "attemptsPlanned": null,
        "puzzleHash": null,
        "above120s": null,
        "pool": null
      },
      "pooled": {
        "outcome": "unstarted",
        "timeoutScope": null,
        "readyWallMs": null,
        "coldWallMs": null,
        "occupiedWallMs": null,
        "cpuTotalMs": null,
        "cpuToDecisionMs": null,
        "cpuResolutionStatus": null,
        "startupMs": null,
        "cleanupMs": null,
        "claimedExact": null,
        "verifiedExact": null,
        "validation": null,
        "attemptsUsed": null,
        "attemptsPlanned": null,
        "puzzleHash": null,
        "above120s": null,
        "pool": null
      },
      "readySpeedup": null,
      "coldSpeedup": null,
      "occupiedSpeedup": null,
      "cpuRatio": null,
      "identity": "not-started"
    },
    {
      "pairId": "classic9:nightmare:2",
      "cell": "classic9",
      "seed": 2,
      "firstArm": "attempts-w4",
      "bothComplete": false,
      "native": {
        "outcome": "unstarted",
        "timeoutScope": null,
        "readyWallMs": null,
        "coldWallMs": null,
        "occupiedWallMs": null,
        "cpuTotalMs": null,
        "cpuToDecisionMs": null,
        "cpuResolutionStatus": null,
        "startupMs": null,
        "cleanupMs": null,
        "claimedExact": null,
        "verifiedExact": null,
        "validation": null,
        "attemptsUsed": null,
        "attemptsPlanned": null,
        "puzzleHash": null,
        "above120s": null,
        "pool": null
      },
      "pooled": {
        "outcome": "unstarted",
        "timeoutScope": null,
        "readyWallMs": null,
        "coldWallMs": null,
        "occupiedWallMs": null,
        "cpuTotalMs": null,
        "cpuToDecisionMs": null,
        "cpuResolutionStatus": null,
        "startupMs": null,
        "cleanupMs": null,
        "claimedExact": null,
        "verifiedExact": null,
        "validation": null,
        "attemptsUsed": null,
        "attemptsPlanned": null,
        "puzzleHash": null,
        "above120s": null,
        "pool": null
      },
      "readySpeedup": null,
      "coldSpeedup": null,
      "occupiedSpeedup": null,
      "cpuRatio": null,
      "identity": "not-started"
    },
    {
      "pairId": "classic9:nightmare:3",
      "cell": "classic9",
      "seed": 3,
      "firstArm": "native-w1",
      "bothComplete": false,
      "native": {
        "outcome": "unstarted",
        "timeoutScope": null,
        "readyWallMs": null,
        "coldWallMs": null,
        "occupiedWallMs": null,
        "cpuTotalMs": null,
        "cpuToDecisionMs": null,
        "cpuResolutionStatus": null,
        "startupMs": null,
        "cleanupMs": null,
        "claimedExact": null,
        "verifiedExact": null,
        "validation": null,
        "attemptsUsed": null,
        "attemptsPlanned": null,
        "puzzleHash": null,
        "above120s": null,
        "pool": null
      },
      "pooled": {
        "outcome": "unstarted",
        "timeoutScope": null,
        "readyWallMs": null,
        "coldWallMs": null,
        "occupiedWallMs": null,
        "cpuTotalMs": null,
        "cpuToDecisionMs": null,
        "cpuResolutionStatus": null,
        "startupMs": null,
        "cleanupMs": null,
        "claimedExact": null,
        "verifiedExact": null,
        "validation": null,
        "attemptsUsed": null,
        "attemptsPlanned": null,
        "puzzleHash": null,
        "above120s": null,
        "pool": null
      },
      "readySpeedup": null,
      "coldSpeedup": null,
      "occupiedSpeedup": null,
      "cpuRatio": null,
      "identity": "not-started"
    }
  ],
  "cells": [
    {
      "cell": "classic9",
      "attemptsPlanned": null,
      "pairs": 3,
      "completePairs": 0,
      "identity": {
        "ok": 0,
        "failed": 0,
        "notComparable": 0,
        "deferred": 3
      },
      "native": {
        "requests": 3,
        "complete": 0,
        "censored": 0,
        "errors": 0,
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
        "errors": 0,
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
        "width": null,
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
    "startedHere": [],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": [
      "IG-S02/c9/classic9:nightmare:1/native-w1",
      "IG-S02/c9/classic9:nightmare:1/attempts-w4",
      "IG-S02/c9/classic9:nightmare:2/attempts-w4",
      "IG-S02/c9/classic9:nightmare:2/native-w1",
      "IG-S02/c9/classic9:nightmare:3/native-w1",
      "IG-S02/c9/classic9:nightmare:3/attempts-w4"
    ]
  },
  "catalogueProbe": {
    "wallMs": 110.3474,
    "cpuMs": 125,
    "note": "unmeasured: loads the engine once per command so neither arm carries the catalogue discovery"
  },
  "syntheticPoolTests": {
    "ok": false,
    "passed": 20,
    "total": 21,
    "results": [
      {
        "id": "merge-equals-the-serial-loop-on-random-scenarios",
        "group": "pure",
        "ok": true,
        "ms": 27,
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
        "ms": 0.5,
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
        "ms": 0.4,
        "title": "an out-of-order attempt, a different configuration or an unexplained keeper replay is a correctness stop",
        "detail": null
      },
      {
        "id": "pool-reversed-completion-and-earlier-exact",
        "group": "pure",
        "ok": true,
        "ms": 66.1,
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
        "ms": 15.8,
        "title": "a reply after the decision is seen but never consumed and leaks no warning or work into the result",
        "detail": null
      },
      {
        "id": "pool-errors-and-cleanup",
        "group": "pure",
        "ok": true,
        "ms": 95.4,
        "title": "a consumed worker error is the request error; an unconsumed one is ignored; an unterminated worker is reported",
        "detail": null
      },
      {
        "id": "pool-timeout-keeps-cpu-and-never-a-hit",
        "group": "pure",
        "ok": true,
        "ms": 48.2,
        "title": "a request that does not decide before the guard is a timeout with its wall and CPU, not a result",
        "detail": null
      },
      {
        "id": "pool-merge-stop-and-lost-worker",
        "group": "pure",
        "ok": true,
        "ms": 31.3,
        "title": "an unexplained merge difference stops the request as an identity violation; a lost worker is an attempt error",
        "detail": null
      },
      {
        "id": "identity-of-a-pair",
        "group": "pure",
        "ok": true,
        "ms": 2,
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
        "ms": 39,
        "title": "the five attempt-pool transforms apply once each to the real digger source in memory and compile; nothing is written",
        "detail": null
      },
      {
        "id": "loader-replace-transform-is-strict",
        "group": "pure",
        "ok": true,
        "ms": 1,
        "title": "a replace transform needs one unique single-line find inside the anchored function and fails closed otherwise",
        "detail": null
      },
      {
        "id": "record-and-summary-of-a-pooled-request",
        "group": "pure",
        "ok": true,
        "ms": 29.7,
        "title": "a pooled and a native request become well-formed records, a saved puzzle, a shard summary and the task summary",
        "detail": null
      },
      {
        "id": "worker-capture-keeps-the-parts-apart",
        "group": "pure",
        "ok": true,
        "ms": 1.9,
        "title": "capture keeps the first-best sample, the search state and the keeper with its ledger separately, per attempt",
        "detail": null
      },
      {
        "id": "threads-reversed-completion",
        "group": "worker",
        "ok": false,
        "ms": 190.7,
        "title": "real workers finishing in reverse order are consumed in native order and the speculative one never counts",
        "detail": {
          "error": "check failed: the decision waited for attempt 1; at most three lanes; all terminated"
        }
      },
      {
        "id": "threads-speculation-is-terminated-and-counted",
        "group": "worker",
        "ok": true,
        "ms": 149.2,
        "title": "busy speculative workers are terminated at the decision and their CPU is in the request total, counted once",
        "detail": {
          "coldWallMs": 145.31349999999998,
          "cpuToDecisionMs": 577,
          "cpuTotalMs": 640,
          "cleanupMs": 3.5255999999999403,
          "peakActive": 4
        }
      },
      {
        "id": "threads-error-and-two-attempt-ceiling",
        "group": "worker",
        "ok": true,
        "ms": 47.2,
        "title": "a consumed worker error ends the request; two attempts use two lanes, never four",
        "detail": {
          "peakActive": 2
        }
      },
      {
        "id": "threads-request-timeout",
        "group": "worker",
        "ok": true,
        "ms": 317.6,
        "title": "a short test-only timer ends a request of busy workers with its CPU, no result",
        "detail": {
          "coldWallMs": 313.91520000000014,
          "cpuToDecisionMs": 624,
          "cpuTotalMs": 624
        }
      }
    ]
  }
}
```
