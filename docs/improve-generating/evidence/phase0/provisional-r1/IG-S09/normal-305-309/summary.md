# IG-S09 / normal-305-309 (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: diagnostic only: no guided pool, setup-clue policy change or IR29 adoption follows from it (IG-S-Q16, B03).

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 10 | 10 | 0 | 0 | 0 | true |

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
| greaterThan:normal:305 | 102.168 | 212.701 | 390 | 90.990 | 215.145 | 297 | 0.762 | 0.891 | 1.011 |
| greaterThan:normal:306 | 268.136 | 375.126 | 609 | 219.385 | 329.282 | 593 | 0.974 | 0.818 | 0.878 |
| greaterThan:normal:307 | 229.387 | 342.429 | 687 | 188.348 | 296.563 | 500 | 0.728 | 0.821 | 0.866 |
| greaterThan:normal:308 | 4972.724 | 5080.108 | 8406 | 5041.682 | 5150 | 8515 | 1.013 | 1.014 | 1.014 |
| greaterThan:normal:309 | 2045.724 | 2149.483 | 3547 | 2108.187 | 2213.525 | 3281 | 0.925 | 1.031 | 1.030 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 5 | 268.136 | 4972.724 | 4972.724 | 268.136 |
| cold wall ms | 5 | 375.126 | 5080.108 | 5080.108 | 375.126 |
| cpu total ms | 5 | 687 | 8406 | 8406 | 687 |

Requests 5, complete 5, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 5; per CPU second 0.367 (all spent CPU 13639 ms, resolved); per cold wall second 0.605 (all spent wall 8268.505 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 5 | 13639 | 8268.505 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 5 | 13639 | 8268.505 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 5 | 219.385 | 5041.682 | 5041.682 | 219.385 |
| cold wall ms | 5 | 329.282 | 5150 | 5150 | 329.282 |
| cpu total ms | 5 | 593 | 8515 | 8515 | 593 |

Requests 5, complete 5, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 5; per CPU second 0.379 (all spent CPU 13186 ms, resolved); per cold wall second 0.604 (all spent wall 8282.556 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 5 | 13186 | 8282.556 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 5 | 13186 | 8282.556 |

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
        "pairId": "greaterThan:normal:305",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 2,
        "passes": 4,
        "removals": 227,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "9ed6c767310f789d2832452faf4f0353fd9a0cfd3f7c24598d322ca51ad8bb64",
        "g1Digest": "9ed6c767310f789d2832452faf4f0353fd9a0cfd3f7c24598d322ca51ad8bb64"
      },
      {
        "pairId": "greaterThan:normal:306",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 7,
        "passes": 22,
        "removals": 834,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "79fdaeedc418d494eea7e44b90e44f4a8b643af2000ef4cd12019acb3d4f12e7",
        "g1Digest": "79fdaeedc418d494eea7e44b90e44f4a8b643af2000ef4cd12019acb3d4f12e7"
      },
      {
        "pairId": "greaterThan:normal:307",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 6,
        "passes": 16,
        "removals": 701,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "2c05e119ec87b3dac84b87ce232267a09e30510301db92e7b613e87a9556460c",
        "g1Digest": "2c05e119ec87b3dac84b87ce232267a09e30510301db92e7b613e87a9556460c"
      },
      {
        "pairId": "greaterThan:normal:308",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 42,
        "passes": 90,
        "removals": 4523,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "64b1055874669ac41d52fe51196a992105b5ca16aaf0cfb33a40f79022798994",
        "g1Digest": "64b1055874669ac41d52fe51196a992105b5ca16aaf0cfb33a40f79022798994"
      },
      {
        "pairId": "greaterThan:normal:309",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 24,
        "passes": 68,
        "removals": 2750,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "29dc75afee48a810c222338bae551d6806fb8529343acf5a84e36d1c0a31fa34",
        "g1Digest": "29dc75afee48a810c222338bae551d6806fb8529343acf5a84e36d1c0a31fa34"
      }
    ],
    "failed": 0,
    "ok": 5,
    "guardBinding": 0,
    "notComparable": 0,
    "deferred": 0,
    "complete": true
  },
  "requests": [
    {
      "key": "IG-S09/normal-305-309/greaterThan:normal:305/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 90.98979999999995,
      "cpuTotalMs": 297,
      "samples": 2,
      "dfsCalls": 26,
      "dfsChecks": 148,
      "diagStatus": "complete",
      "diagWallMs": 103.17149999999992,
      "problems": []
    },
    {
      "key": "IG-S09/normal-305-309/greaterThan:normal:305/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 102.16830000000004,
      "cpuTotalMs": 390,
      "samples": 2,
      "dfsCalls": 231,
      "dfsChecks": 218,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-305-309/greaterThan:normal:306/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 268.13609999999994,
      "cpuTotalMs": 609,
      "samples": 7,
      "dfsCalls": 844,
      "dfsChecks": 520,
      "diagStatus": "complete",
      "diagWallMs": 107.54600000000005,
      "problems": []
    },
    {
      "key": "IG-S09/normal-305-309/greaterThan:normal:306/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 219.38470000000007,
      "cpuTotalMs": 593,
      "samples": 7,
      "dfsCalls": 132,
      "dfsChecks": 492,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-305-309/greaterThan:normal:307/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 188.34789999999975,
      "cpuTotalMs": 500,
      "samples": 6,
      "dfsCalls": 98,
      "dfsChecks": 365,
      "diagStatus": "complete",
      "diagWallMs": 113.0353,
      "problems": []
    },
    {
      "key": "IG-S09/normal-305-309/greaterThan:normal:307/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 229.38729999999987,
      "cpuTotalMs": 687,
      "samples": 6,
      "dfsCalls": 711,
      "dfsChecks": 407,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-305-309/greaterThan:normal:308/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 4972.7238,
      "cpuTotalMs": 8406,
      "samples": 42,
      "dfsCalls": 34199,
      "dfsChecks": 140437,
      "diagStatus": "complete",
      "diagWallMs": 134.72099999999955,
      "problems": []
    },
    {
      "key": "IG-S09/normal-305-309/greaterThan:normal:308/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 5041.682499999999,
      "cpuTotalMs": 8515,
      "samples": 42,
      "dfsCalls": 30209,
      "dfsChecks": 140266,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-305-309/greaterThan:normal:309/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 2108.187099999999,
      "cpuTotalMs": 3281,
      "samples": 24,
      "dfsCalls": 10308,
      "dfsChecks": 55440,
      "diagStatus": "complete",
      "diagWallMs": 116.03029999999853,
      "problems": []
    },
    {
      "key": "IG-S09/normal-305-309/greaterThan:normal:309/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 2045.7243999999992,
      "cpuTotalMs": 3547,
      "samples": 24,
      "dfsCalls": 12636,
      "dfsChecks": 55799,
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
      "IG-S09/normal-305-309/greaterThan:normal:305/g1",
      "IG-S09/normal-305-309/greaterThan:normal:305/g0",
      "IG-S09/normal-305-309/greaterThan:normal:306/g0",
      "IG-S09/normal-305-309/greaterThan:normal:306/g1",
      "IG-S09/normal-305-309/greaterThan:normal:307/g1",
      "IG-S09/normal-305-309/greaterThan:normal:307/g0",
      "IG-S09/normal-305-309/greaterThan:normal:308/g0",
      "IG-S09/normal-305-309/greaterThan:normal:308/g1",
      "IG-S09/normal-305-309/greaterThan:normal:309/g1",
      "IG-S09/normal-305-309/greaterThan:normal:309/g0"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
