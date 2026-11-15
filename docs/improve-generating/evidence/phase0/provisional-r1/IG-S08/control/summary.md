# IG-S08 / control (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: attribution only (pre-MS07, provisional (pre-freeze)); a censored request is a lower bound, never a completed latency or a pass.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 2 | 2 | 0 | 0 | 0 | true |

Exclusions: an observed request is an attribution run, not a timing run: its wall time is never a before/after figure; the catalogue probe, the calibration, the engine checks, the synthetic recovery test and the independent audit are outside every generation time; the historical 325.313 s Jigsaw request (I5, seed 1111) is not remeasured to completion: the command ceiling is 300 s

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | fe2bae1efce6bf8df07ff7020a0ca422c10e9b4d3579378387cc6cc2ae743fce |
| adapters | jigsaw-profile |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Paired rows (before = reference, after = prototype)

| pair | ref ready ms | ref cold ms | ref cpu ms | proto ready ms | proto cold ms | proto cpu ms | cpu factor | ready factor | cold factor |
|---|---|---|---|---|---|---|---|---|---|
| jigsaw9:expert:1100 | 510.736 | 611.181 | 984 | 591.954 | 722.092 | 1109 | 1.127 | 1.159 | 1.181 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 510.736 | 510.736 | 510.736 | 510.736 |
| cold wall ms | 1 | 611.181 | 611.181 | 611.181 | 611.181 |
| cpu total ms | 1 | 984 | 984 | 984 | 984 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 1; per CPU second 1.016 (all spent CPU 984 ms, resolved); per cold wall second 1.621 (all spent wall 616.811 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 984 | 616.811 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 984 | 616.811 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 591.954 | 591.954 | 591.954 | 591.954 |
| cold wall ms | 1 | 722.092 | 722.092 | 722.092 | 722.092 |
| cpu total ms | 1 | 1109 | 1109 | 1109 | 1109 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 1; per CPU second 0.902 (all spent CPU 1109 ms, resolved); per cold wall second 1.374 (all spent wall 727.658 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 1109 | 727.658 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 1109 | 727.658 |

## Task details

```json
{
  "label": "pre-MS07: the catalogue, floors and search may change when difficulty-v3 freezes (MS07); every number here is provisional (pre-freeze) and a frozen rerun with the same seeds and bound is the confirmatory one",
  "provenance": {
    "harnessBase": "5027a528f03a (IG-S07 r2 writer; this task adds files and one line each to run.cjs and worker.cjs, so the harness fingerprint of its commands differs and is recorded in each command.json)",
    "loopTestProvenance": "062742c330eb (the IG-S07 loop-check command: the budget-check counts of the logical solver loop)",
    "counterLimitation": "chain propagation checks that bypass ctx.check are not counted (IG-S07 limitation carried forward); in this request the budget is absent altogether, so solver budget checks are unobservable and recorded as unknown, never zero"
  },
  "arms": {
    "prototype": "observed native request (adapter jigsaw-profile, beacon installed for the one pipeline call)",
    "reference": "unobserved native request (the unchanged host path), control only"
  },
  "identity": {
    "pairs": [
      {
        "pairId": "IG-S08/control/jigsaw9:expert:1100/profiled",
        "comparator": "IG-S08/control/jigsaw9:expert:1100/unprofiled",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "6b2c35d92da1ce29fee1b6bb917a8a6a095c4d886924e993fe0a4ddf65028423",
        "comparatorPuzzleHash": "6b2c35d92da1ce29fee1b6bb917a8a6a095c4d886924e993fe0a4ddf65028423",
        "observedDigest": "144eb8e83b273d1297d5eed1df3a8cd82a7c5806fe3e8b1954da0f0033a7f92f",
        "comparatorDigest": "144eb8e83b273d1297d5eed1df3a8cd82a7c5806fe3e8b1954da0f0033a7f92f"
      }
    ],
    "failed": 0,
    "ok": 1,
    "notComparable": 0,
    "deferred": 0,
    "complete": true
  },
  "observations": [
    {
      "key": "IG-S08/control/jigsaw9:expert:1100/profiled",
      "outcome": "complete",
      "censored": false,
      "timeoutScope": null,
      "limitAppliedMs": 180000,
      "guardMs": 180000,
      "coldWallMs": 722.0924999999997,
      "readyWallMs": 591.9542999999994,
      "cpuToDecisionMs": 1109,
      "cpuTotalMs": 1109,
      "source": "final",
      "markerAgreement": "finished",
      "current": null,
      "stages": [
        {
          "stage": "outside",
          "wallMsLowerBound": 5.236084,
          "share": 0.008897826238484893,
          "counters": {
            "dfsNodes": 0,
            "dfsChecks": 0,
            "dfsBacktracks": 0,
            "gridSearches": 0,
            "gridRestarts": 0,
            "gridBacktracks": 0
          }
        },
        {
          "stage": "configure",
          "wallMsLowerBound": 0.397461,
          "share": 0.0006754167646230359,
          "counters": {
            "dfsNodes": 0,
            "dfsChecks": 0,
            "dfsBacktracks": 0,
            "gridSearches": 0,
            "gridRestarts": 0,
            "gridBacktracks": 0
          }
        },
        {
          "stage": "buildModel",
          "wallMsLowerBound": 10.347167,
          "share": 0.017583234727820453,
          "counters": {
            "dfsNodes": 83,
            "dfsChecks": 81,
            "dfsBacktracks": 18,
            "gridSearches": 1,
            "gridRestarts": 0,
            "gridBacktracks": 12
          }
        },
        {
          "stage": "fullGrid",
          "wallMsLowerBound": 0.922363,
          "share": 0.0015673976396879121,
          "counters": {
            "dfsNodes": 120,
            "dfsChecks": 117,
            "dfsBacktracks": 39,
            "gridSearches": 3,
            "gridRestarts": 0,
            "gridBacktracks": 39
          }
        },
        {
          "stage": "extraStructure",
          "wallMsLowerBound": 0.71167,
          "share": 0.0012093610414085306,
          "counters": {
            "dfsNodes": 0,
            "dfsChecks": 0,
            "dfsBacktracks": 0,
            "gridSearches": 0,
            "gridRestarts": 0,
            "gridBacktracks": 0
          }
        },
        {
          "stage": "dig",
          "wallMsLowerBound": 231.458495,
          "share": 0.393323993643193,
          "counters": {
            "dfsNodes": 485,
            "dfsChecks": 451,
            "dfsBacktracks": 914,
            "gridSearches": 0,
            "gridRestarts": 0,
            "gridBacktracks": 0
          }
        },
        {
          "stage": "rate",
          "wallMsLowerBound": 8.941650000000001,
          "share": 0.01519479977505106,
          "counters": {
            "dfsNodes": 0,
            "dfsChecks": 0,
            "dfsBacktracks": 0,
            "gridSearches": 0,
            "gridRestarts": 0,
            "gridBacktracks": 0
          }
        },
        {
          "stage": "tune",
          "wallMsLowerBound": 0.417969,
          "share": 0.0007102665914208581,
          "counters": {
            "dfsNodes": 0,
            "dfsChecks": 0,
            "dfsBacktracks": 0,
            "gridSearches": 0,
            "gridRestarts": 0,
            "gridBacktracks": 0
          }
        },
        {
          "stage": "local",
          "wallMsLowerBound": 330.034915,
          "share": 0.56083770357831,
          "counters": {
            "dfsNodes": 4286,
            "dfsChecks": 3584,
            "dfsBacktracks": 5073,
            "gridSearches": 0,
            "gridRestarts": 0,
            "gridBacktracks": 0
          }
        }
      ],
      "finderGroups": [
        {
          "group": "basic",
          "ms": 73.356689,
          "calls": 196641,
          "hits": 140879
        },
        {
          "group": "fish",
          "ms": 53.736572,
          "calls": 3180,
          "hits": 907
        },
        {
          "group": "subset",
          "ms": 42.07837,
          "calls": 8501,
          "hits": 446
        },
        {
          "group": "chain",
          "ms": 18.874512,
          "calls": 82,
          "hits": 65
        },
        {
          "group": "locked",
          "ms": 18.349607999999996,
          "calls": 13589,
          "hits": 7546
        },
        {
          "group": "wing",
          "ms": 8.903566000000001,
          "calls": 870,
          "hits": 54
        }
      ],
      "layout": {
        "layoutAttempts": 1,
        "layoutGrowthBacktracks": 0,
        "layoutLevels": 72,
        "layoutFeasibility": 247,
        "layoutUnsolvable": 0,
        "layoutHard": 0,
        "layoutAccepted": 1,
        "gridUnlimitedEntered": 0,
        "samples": 31
      },
      "totals": {
        "dfsNodes": 4974,
        "dfsChecks": 4233,
        "dfsBacktracks": 6044,
        "gridSearches": 4,
        "gridRestarts": 0,
        "gridBacktracks": 51
      },
      "beaconObservedMs": 588.4677740000002,
      "problems": []
    }
  ],
  "overhead": {
    "n": 1,
    "readyWallFactor": 1.159021397147607,
    "coldWallFactor": 1.1814698252483102,
    "cpuFactor": 1.1270325203252032,
    "note": "one pair of requests, time-separated: a single ratio, not a distribution; the profiled request is an attribution run, never a timing run",
    "estimate": {
      "spans": 230594,
      "counterIncrements": 15255,
      "markersPosted": 268,
      "estimatedMs": 47.789360742999584,
      "shareOfObservedWall": 0.08120981785996588,
      "note": "calibrated unit costs times the operations the beacon counted: an estimate, never a correction"
    }
  },
  "calibration": {
    "wallMs": 106.49609999999996,
    "cpuMs": 156,
    "enterLeavePairNs": 206.51999999999816,
    "epochReadNs": 90.87999999999964,
    "counterIncrementNs": 6.738600000000133,
    "markerPostNs": 239.8900000000026,
    "iterations": 50000,
    "repeats": 3,
    "markersPosted": 60002
  },
  "engineChecks": {
    "passed": 28,
    "total": 28,
    "results": [
      {
        "id": "engine.hooks-absent-at-start.classic4-veryEasy-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.same-puzzle.classic4-veryEasy-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.same-budget-checks.classic4-veryEasy-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.restored.classic4-veryEasy-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.stage-markers-balanced.classic4-veryEasy-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.time-accounting.classic4-veryEasy-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.counters-observed.classic4-veryEasy-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.budget-error-unwinds.classic4-veryEasy-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.abandoned-generator-unwinds.classic4-veryEasy-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.hooks-absent-at-start.classic9-hard-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.same-puzzle.classic9-hard-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.same-budget-checks.classic9-hard-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.restored.classic9-hard-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.stage-markers-balanced.classic9-hard-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.time-accounting.classic9-hard-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.counters-observed.classic9-hard-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.layout-same-regions.layout-1100",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.layout-counters-equal-stats.layout-1100",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.layout-restored.layout-1100",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.layout-same-regions.layout-9",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.layout-counters-equal-stats.layout-9",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.layout-restored.layout-9",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.grid-same-grid.grid-classic4-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.grid-counters-equal-stats.grid-classic4-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.grid-restored.grid-classic4-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.grid-same-grid.grid-classic9-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.grid-counters-equal-stats.grid-classic9-1",
        "ok": true,
        "detail": null
      },
      {
        "id": "engine.grid-restored.grid-classic9-1",
        "ok": true,
        "detail": null
      }
    ]
  },
  "syntheticRecovery": {
    "ok": true,
    "checks": [
      {
        "id": "recovery.timeout-recorded",
        "ok": true,
        "detail": {
          "outcome": "request-timeout",
          "scope": "request"
        }
      },
      {
        "id": "recovery.no-invented-result",
        "ok": true,
        "detail": null
      },
      {
        "id": "recovery.host-stayed-responsive",
        "ok": true,
        "detail": {
          "coldWallMs": 1510.0187999999998,
          "guardMs": 1500
        }
      },
      {
        "id": "recovery.worker-terminated",
        "ok": true,
        "detail": null
      },
      {
        "id": "recovery.journal-wellformed",
        "ok": true,
        "detail": {
          "bad": [],
          "problems": []
        }
      },
      {
        "id": "recovery.stage-markers-survive",
        "ok": true,
        "detail": [
          "configure",
          "buildModel",
          "fullGrid(open)"
        ]
      },
      {
        "id": "recovery.layout-markers",
        "ok": true,
        "detail": 4
      },
      {
        "id": "recovery.heartbeats-while-busy",
        "ok": true,
        "detail": {
          "heartbeats": 3
        }
      },
      {
        "id": "recovery.counters-move-while-worker-blocked",
        "ok": true,
        "detail": [
          98110742,
          203900363,
          311582749
        ]
      },
      {
        "id": "recovery.final-read",
        "ok": true,
        "detail": "running"
      },
      {
        "id": "recovery.last-stage-from-shared-memory",
        "ok": true,
        "detail": {
          "ctx": 6,
          "ctxName": "fullGrid",
          "sub": 0,
          "part": {
            "kind": "own",
            "id": null,
            "group": null
          },
          "stage": "fullGrid",
          "step": "fullGrid",
          "attempt": 2,
          "sample": 0,
          "kind": "none",
          "inProgressMs": 1478.037109375,
          "depth": 1
        }
      },
      {
        "id": "recovery.marker-and-memory-agree",
        "ok": true,
        "detail": "agree"
      },
      {
        "id": "recovery.final-counters-cover-last-heartbeat",
        "ok": true,
        "detail": {
          "dfsNodes": 382906999,
          "dfsChecks": 382906999,
          "dfsBacktracks": 0,
          "gridSearches": 0,
          "gridRestarts": 1461,
          "gridBacktracks": 0
        }
      },
      {
        "id": "recovery.fallback-last-heartbeat",
        "ok": true,
        "detail": "last-heartbeat"
      },
      {
        "id": "recovery.truncated-last-line-tolerated",
        "ok": true,
        "detail": {
          "truncated": true
        }
      }
    ],
    "summary": {
      "heartbeats": 3,
      "markers": 10,
      "stages": 3,
      "source": "final",
      "coldWallMs": 1510.0187999999998
    },
    "journal": "stage-journal-synthetic.jsonl",
    "journalSha256": "d68334227a6a0fe356c98c15b9fce1b2602ae049ae8329d19d3524eafac782ad",
    "guardMs": 1500,
    "heartbeatMs": 400
  },
  "catalogueProbe": {
    "wallMs": 113.6271999999999,
    "cpuMs": 110,
    "note": "unmeasured: loads the engine once per command so no request carries the catalogue discovery"
  },
  "unknownCounters": [
    {
      "counter": "solverBudgetChecks",
      "why": "the request has no budget (ctx.check is a no-op); the propagation checks of the chain finders bypass ctx.check in any case (IG-S07 limitation)"
    },
    {
      "counter": "constraintPropagationOperations",
      "why": "no counter exists in the private source; the time is part of the cell of the caller (the logical solver's own code, a finder or the depth-first search)"
    },
    {
      "counter": "findingApplicationTime",
      "why": "part of the logical solver's own code (sub solver), not separated from the ladder loop"
    },
    {
      "counter": "perCallTimeOfOracleObjectiveKeeperLocal",
      "why": "wall time and call counts are kept per context, not per individual call"
    }
  ],
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S08/control/jigsaw9:expert:1100/unprofiled",
      "IG-S08/control/jigsaw9:expert:1100/profiled"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
