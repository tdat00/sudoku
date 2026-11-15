# IG-S08 / tail (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: attribution only (pre-MS07, provisional (pre-freeze)); a censored request is a lower bound, never a completed latency or a pass.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 1 | 0 | 1 | 0 | 0 | true |

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
| jigsaw9:expert:1111 | n/a | n/a | n/a | 239879.205 | 240014.552 | 238562 | n/a | n/a | n/a |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 0 | n/a | n/a | n/a | n/a |
| cold wall ms | 0 | n/a | n/a | n/a | n/a |
| cpu total ms | 0 | n/a | n/a | n/a | n/a |

Requests 1, complete 0, censored 1, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 238562 ms, resolved); per cold wall second 0 (all spent wall 240022.319 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 0 | 0 | 0 |
| censored | 1 | 238562 | 240022.319 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 238562 | 240022.319 |

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
        "pairId": "IG-S08/tail/jigsaw9:expert:1111/profiled",
        "verdict": "not-comparable",
        "problems": [
          "no comparator: the historical 325.313 s request was not retained and an uncensored native request of this length is not run (it would exceed the 300 s command ceiling)"
        ]
      }
    ],
    "failed": 0,
    "ok": 0,
    "notComparable": 1,
    "deferred": 0,
    "complete": false
  },
  "observations": [
    {
      "key": "IG-S08/tail/jigsaw9:expert:1111/profiled",
      "outcome": "request-timeout",
      "censored": true,
      "timeoutScope": "request",
      "limitAppliedMs": 240000,
      "guardMs": 240000,
      "coldWallMs": 240014.5519,
      "readyWallMs": 239879.2054,
      "cpuToDecisionMs": 238547,
      "cpuTotalMs": 238562,
      "source": "final",
      "markerAgreement": "agree",
      "current": {
        "ctx": 6,
        "ctxName": "fullGrid",
        "sub": 45,
        "part": {
          "kind": "dfs",
          "id": null,
          "group": null
        },
        "stage": "fullGrid",
        "step": "fullGrid",
        "attempt": 4,
        "sample": 12,
        "kind": "local",
        "inProgressMs": 238181.3505859375,
        "depth": 3
      },
      "stages": [
        {
          "stage": "outside",
          "wallMsLowerBound": 5.413086,
          "share": 0.00002256608288693637,
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
          "wallMsLowerBound": 0.388916,
          "share": 0.0000016213137371280902,
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
          "wallMsLowerBound": 37.738282,
          "share": 0.0001573234195101609,
          "counters": {
            "dfsNodes": 7255,
            "dfsChecks": 7253,
            "dfsBacktracks": 13444,
            "gridSearches": 27,
            "gridRestarts": 26,
            "gridBacktracks": 5252
          }
        },
        {
          "stage": "fullGrid",
          "wallMsLowerBound": 238776.6374509375,
          "share": 0.9954124859981553,
          "counters": {
            "dfsNodes": 84717442,
            "dfsChecks": 84717439,
            "dfsBacktracks": 176221059,
            "gridSearches": 111,
            "gridRestarts": 108,
            "gridBacktracks": 440433
          }
        },
        {
          "stage": "extraStructure",
          "wallMsLowerBound": 0.203857,
          "share": 8.498394370756696e-7,
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
          "wallMsLowerBound": 270.27075099999996,
          "share": 0.0011267052045691756,
          "counters": {
            "dfsNodes": 800,
            "dfsChecks": 753,
            "dfsBacktracks": 1511,
            "gridSearches": 0,
            "gridRestarts": 0,
            "gridBacktracks": 0
          }
        },
        {
          "stage": "rate",
          "wallMsLowerBound": 11.164792000000002,
          "share": 0.000046543805453562745,
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
          "wallMsLowerBound": 0.478271,
          "share": 0.000001993817025707322,
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
          "wallMsLowerBound": 774.7814939999998,
          "share": 0.0032299105192247807,
          "counters": {
            "dfsNodes": 13173,
            "dfsChecks": 12016,
            "dfsBacktracks": 19121,
            "gridSearches": 0,
            "gridRestarts": 0,
            "gridBacktracks": 0
          }
        }
      ],
      "finderGroups": [
        {
          "group": "chain",
          "ms": 147.277343,
          "calls": 811,
          "hits": 573
        },
        {
          "group": "fish",
          "ms": 118.72900200000001,
          "calls": 7168,
          "hits": 1661
        },
        {
          "group": "basic",
          "ms": 96.570067,
          "calls": 264921,
          "hits": 185818
        },
        {
          "group": "subset",
          "ms": 84.139649,
          "calls": 17416,
          "hits": 936
        },
        {
          "group": "locked",
          "ms": 32.623047,
          "calls": 20942,
          "hits": 10813
        },
        {
          "group": "wing",
          "ms": 19.80664,
          "calls": 3141,
          "hits": 94
        }
      ],
      "layout": {
        "layoutAttempts": 1,
        "layoutGrowthBacktracks": 6,
        "layoutLevels": 78,
        "layoutFeasibility": 273,
        "layoutUnsolvable": 0,
        "layoutHard": 0,
        "layoutAccepted": 1,
        "gridUnlimitedEntered": 1,
        "samples": 39
      },
      "totals": {
        "dfsNodes": 84738670,
        "dfsChecks": 84737461,
        "dfsBacktracks": 176255135,
        "gridSearches": 138,
        "gridRestarts": 134,
        "gridBacktracks": 445685
      },
      "beaconObservedMs": 239877.07689993753,
      "problems": []
    }
  ],
  "overhead": null,
  "calibration": null,
  "engineChecks": null,
  "syntheticRecovery": null,
  "catalogueProbe": null,
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
      "IG-S08/tail/jigsaw9:expert:1111/profiled"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
