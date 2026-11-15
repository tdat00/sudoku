# IG-S09 / observer-control (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: diagnostic only: no guided pool, setup-clue policy change or IR29 adoption follows from it (IG-S-Q16, B03).

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 2 | 2 | 0 | 0 | 0 | true |

Exclusions: a captured request is a diagnostic run with observation hooks and trace summary: never an uninstrumented headline; the post-timing diagnosis (independent rating, minimality, probes) and the harness validation are outside every generation time; the observer-free controls are overhead comparators, not new headline measurements

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | 9da69f60fbd2d71eeaec2949f805ba8fac3c6f2c6bf88b5848398e5b16c128ed |
| adapters | none |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Paired rows (before = reference, after = prototype)

| pair | ref ready ms | ref cold ms | ref cpu ms | proto ready ms | proto cold ms | proto cpu ms | cpu factor | ready factor | cold factor |
|---|---|---|---|---|---|---|---|---|---|
| control:greaterThan:normal:300 | 2087.386 | 2186.342 | 3515 | n/a | n/a | n/a | n/a | n/a | n/a |
| control:greaterThan:nightmare:700 | 12173.021 | 12260.051 | 16610 | n/a | n/a | n/a | n/a | n/a | n/a |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 2 | 2087.386 | 12173.021 | 12173.021 | 12173.021 |
| cold wall ms | 2 | 2186.342 | 12260.051 | 12260.051 | 12260.051 |
| cpu total ms | 2 | 3515 | 16610 | 16610 | 16610 |

Requests 2, complete 2, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 2; per CPU second 0.099 (all spent CPU 20125 ms, resolved); per cold wall second 0.138 (all spent wall 14482.923 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 2 | 20125 | 14482.923 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 2 | 20125 | 14482.923 |

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
        "pairId": "control:greaterThan:normal:300",
        "kind": "control",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "g0Key": "IG-S09/normal-300-304/greaterThan:normal:300/g0",
        "g0Digest": "9f44a498a2d5566979b710d072363674a102a5df092e1d2c8b19335506d6d23f",
        "controlDigest": "9f44a498a2d5566979b710d072363674a102a5df092e1d2c8b19335506d6d23f"
      },
      {
        "pairId": "control:greaterThan:nightmare:700",
        "kind": "control",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "g0Key": "IG-S09/nightmare-700-701/greaterThan:nightmare:700/g0",
        "g0Digest": "6332da1ef85c61f60c3de47e49ea733178337a4f43de584e93b394cdec6a64d9",
        "controlDigest": "6332da1ef85c61f60c3de47e49ea733178337a4f43de584e93b394cdec6a64d9"
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
      "key": "IG-S09/observer-control/greaterThan:normal:300/native",
      "arm": "native-observer-free",
      "outcome": "complete",
      "readyWallMs": 2087.3855000000003,
      "cpuTotalMs": 3515,
      "samples": null,
      "dfsCalls": null,
      "dfsChecks": null,
      "diagStatus": null,
      "diagWallMs": null,
      "problems": null
    },
    {
      "key": "IG-S09/observer-control/greaterThan:nightmare:700/native",
      "arm": "native-observer-free",
      "outcome": "complete",
      "readyWallMs": 12173.0213,
      "cpuTotalMs": 16610,
      "samples": null,
      "dfsCalls": null,
      "dfsChecks": null,
      "diagStatus": null,
      "diagWallMs": null,
      "problems": null
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
      "IG-S09/observer-control/greaterThan:normal:300/native",
      "IG-S09/observer-control/greaterThan:nightmare:700/native"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
