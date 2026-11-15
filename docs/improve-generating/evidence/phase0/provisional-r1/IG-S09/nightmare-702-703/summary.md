# IG-S09 / nightmare-702-703 (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: diagnostic only: no guided pool, setup-clue policy change or IR29 adoption follows from it (IG-S-Q16, B03).

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 4 | 4 | 0 | 0 | 0 | true |

Exclusions: a captured request is a diagnostic run with observation hooks and trace summary: never an uninstrumented headline; the post-timing diagnosis (independent rating, minimality, probes) and the harness validation are outside every generation time; the observer-free controls are overhead comparators, not new headline measurements

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | 9da69f60fbd2d71eeaec2949f805ba8fac3c6f2c6bf88b5848398e5b16c128ed |
| adapters | gt-diagnostic |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Paired rows (before = reference, after = prototype)

| pair | ref ready ms | ref cold ms | ref cpu ms | proto ready ms | proto cold ms | proto cpu ms | cpu factor | ready factor | cold factor |
|---|---|---|---|---|---|---|---|---|---|
| greaterThan:nightmare:702 | 9705.083 | 9829.561 | 12688 | 64602.102 | 64709.520 | 67281 | 5.303 | 6.657 | 6.583 |
| greaterThan:nightmare:703 | 1966.877 | 2071.937 | 2453 | 11306.186 | 11413.986 | 11905 | 4.853 | 5.748 | 5.509 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 2 | 1966.877 | 9705.083 | 9705.083 | 9705.083 |
| cold wall ms | 2 | 2071.937 | 9829.561 | 9829.561 | 9829.561 |
| cpu total ms | 2 | 2453 | 12688 | 12688 | 12688 |

Requests 2, complete 2, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 2; per CPU second 0.132 (all spent CPU 15141 ms, resolved); per cold wall second 0.167 (all spent wall 11947.877 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 2 | 15141 | 11947.877 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 2 | 15141 | 11947.877 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 2 | 11306.186 | 64602.102 | 64602.102 | 64602.102 |
| cold wall ms | 2 | 11413.986 | 64709.520 | 64709.520 | 64709.520 |
| cpu total ms | 2 | 11905 | 67281 | 67281 | 67281 |

Requests 2, complete 2, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 2; per CPU second 0.025 (all spent CPU 79186 ms, resolved); per cold wall second 0.026 (all spent wall 76165.049 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 2 | 79186 | 76165.049 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 2 | 79186 | 76165.049 |

## Task details

```json
{
  "arms": {
    "reference": "G0: the native first-allowed sign pass, with capture",
    "prototype": "G1: native restricted solve first in the first technique sign pass, with the same capture",
    "control": "observer-free native request (no capture hooks)"
  },
  "identity": {
    "pairs": [
      {
        "pairId": "greaterThan:nightmare:702",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 30,
        "passes": 190,
        "removals": 4901,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "6ca7a43d0bfb072777c27ef87b18120f26dbcaf93e035eb57406eb6f64d7591a",
        "g1Digest": "6ca7a43d0bfb072777c27ef87b18120f26dbcaf93e035eb57406eb6f64d7591a"
      },
      {
        "pairId": "greaterThan:nightmare:703",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 11,
        "passes": 72,
        "removals": 1819,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "33c9755660542c078eafa5452bbfa682f270e4dae31b45d95906b452cf14f15b",
        "g1Digest": "33c9755660542c078eafa5452bbfa682f270e4dae31b45d95906b452cf14f15b"
      }
    ],
    "failed": 0,
    "ok": 2,
    "guardBinding": 0,
    "notComparable": 0,
    "deferred": 0,
    "complete": true
  },
  "requests": [
    {
      "key": "IG-S09/nightmare-702-703/greaterThan:nightmare:702/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 9705.083,
      "cpuTotalMs": 12688,
      "samples": 30,
      "dfsCalls": 24480,
      "dfsChecks": 224492,
      "diagStatus": "complete",
      "diagWallMs": 167.5106999999989,
      "problems": []
    },
    {
      "key": "IG-S09/nightmare-702-703/greaterThan:nightmare:702/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 64602.102300000006,
      "cpuTotalMs": 67281,
      "samples": 30,
      "dfsCalls": 21882,
      "dfsChecks": 213953,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/nightmare-702-703/greaterThan:nightmare:703/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 11306.186400000006,
      "cpuTotalMs": 11905,
      "samples": 11,
      "dfsCalls": 795,
      "dfsChecks": 7159,
      "diagStatus": "complete",
      "diagWallMs": 124.20580000001064,
      "problems": []
    },
    {
      "key": "IG-S09/nightmare-702-703/greaterThan:nightmare:703/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 1966.8770999999979,
      "cpuTotalMs": 2453,
      "samples": 11,
      "dfsCalls": 1837,
      "dfsChecks": 9712,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    }
  ],
  "guardSettings": {
    "minimalNodeCap": 200000,
    "probeNodeCap": 200000,
    "probeStepCap": 100000,
    "probeGroups": 3,
    "diagBudgetMs": 30000
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S09/nightmare-702-703/greaterThan:nightmare:702/g0",
      "IG-S09/nightmare-702-703/greaterThan:nightmare:702/g1",
      "IG-S09/nightmare-702-703/greaterThan:nightmare:703/g1",
      "IG-S09/nightmare-702-703/greaterThan:nightmare:703/g0"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
