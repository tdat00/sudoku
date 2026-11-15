# IG-S09 / normal-300-304 (provisional-r1, a1)

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
| greaterThan:normal:300 | 2098.213 | 2220.576 | 3609 | 1976.430 | 2084.850 | 3218 | 0.892 | 0.942 | 0.939 |
| greaterThan:normal:301 | 77.769 | 184.699 | 281 | 74.682 | 182.075 | 235 | 0.836 | 0.960 | 0.986 |
| greaterThan:normal:302 | 298.034 | 403.233 | 827 | 250.081 | 355.120 | 593 | 0.717 | 0.839 | 0.881 |
| greaterThan:normal:303 | 3757.333 | 3866.194 | 6031 | 3670.857 | 3777.876 | 6109 | 1.013 | 0.977 | 0.977 |
| greaterThan:normal:304 | 271.844 | 378.719 | 577 | 234.192 | 337.174 | 546 | 0.946 | 0.861 | 0.890 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 5 | 298.034 | 3757.333 | 3757.333 | 298.034 |
| cold wall ms | 5 | 403.233 | 3866.194 | 3866.194 | 403.233 |
| cpu total ms | 5 | 827 | 6031 | 6031 | 827 |

Requests 5, complete 5, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 5; per CPU second 0.442 (all spent CPU 11325 ms, resolved); per cold wall second 0.700 (all spent wall 7147.458 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 5 | 11325 | 7147.458 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 5 | 11325 | 7147.458 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 5 | 250.081 | 3670.857 | 3670.857 | 250.081 |
| cold wall ms | 5 | 355.120 | 3777.876 | 3777.876 | 355.120 |
| cpu total ms | 5 | 593 | 6109 | 6109 | 593 |

Requests 5, complete 5, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 5; per CPU second 0.467 (all spent CPU 10701 ms, resolved); per cold wall second 0.736 (all spent wall 6790.512 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 5 | 10701 | 6790.512 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 5 | 10701 | 6790.512 |

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
        "pairId": "greaterThan:normal:300",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 18,
        "passes": 54,
        "removals": 2029,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "9f44a498a2d5566979b710d072363674a102a5df092e1d2c8b19335506d6d23f",
        "g1Digest": "9f44a498a2d5566979b710d072363674a102a5df092e1d2c8b19335506d6d23f"
      },
      {
        "pairId": "greaterThan:normal:301",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 1,
        "passes": 4,
        "removals": 137,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "781380b89401962e44cc1321714663377829786c396c78f94fba11b8daf67647",
        "g1Digest": "781380b89401962e44cc1321714663377829786c396c78f94fba11b8daf67647"
      },
      {
        "pairId": "greaterThan:normal:302",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 9,
        "passes": 32,
        "removals": 1117,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "8e0a342359d8caa05a6294089d813aca9ea90ac003901b012b4d797d79c6192b",
        "g1Digest": "8e0a342359d8caa05a6294089d813aca9ea90ac003901b012b4d797d79c6192b"
      },
      {
        "pairId": "greaterThan:normal:303",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 36,
        "passes": 100,
        "removals": 4045,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "5ec58631f1b4ce544f7195d91c434e0ac35bc23f818427abdae1ef5e44f6ae0a",
        "g1Digest": "5ec58631f1b4ce544f7195d91c434e0ac35bc23f818427abdae1ef5e44f6ae0a"
      },
      {
        "pairId": "greaterThan:normal:304",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 9,
        "passes": 18,
        "removals": 1018,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "144d1871ad8ab93dfea293e28665f93fe80409e2499645bd8d3c0d89001d8090",
        "g1Digest": "144d1871ad8ab93dfea293e28665f93fe80409e2499645bd8d3c0d89001d8090"
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
      "key": "IG-S09/normal-300-304/greaterThan:normal:300/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 2098.2125,
      "cpuTotalMs": 3609,
      "samples": 18,
      "dfsCalls": 11944,
      "dfsChecks": 61744,
      "diagStatus": "complete",
      "diagWallMs": 112.95969999999988,
      "problems": []
    },
    {
      "key": "IG-S09/normal-300-304/greaterThan:normal:300/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 1976.4296,
      "cpuTotalMs": 3218,
      "samples": 18,
      "dfsCalls": 10207,
      "dfsChecks": 61614,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-300-304/greaterThan:normal:301/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 74.6822000000002,
      "cpuTotalMs": 235,
      "samples": 1,
      "dfsCalls": 42,
      "dfsChecks": 334,
      "diagStatus": "complete",
      "diagWallMs": 96.68019999999979,
      "problems": []
    },
    {
      "key": "IG-S09/normal-300-304/greaterThan:normal:301/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 77.76910000000044,
      "cpuTotalMs": 281,
      "samples": 1,
      "dfsCalls": 139,
      "dfsChecks": 429,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-300-304/greaterThan:normal:302/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 298.03420000000006,
      "cpuTotalMs": 827,
      "samples": 9,
      "dfsCalls": 1130,
      "dfsChecks": 1191,
      "diagStatus": "complete",
      "diagWallMs": 101.42180000000008,
      "problems": []
    },
    {
      "key": "IG-S09/normal-300-304/greaterThan:normal:302/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 250.08100000000013,
      "cpuTotalMs": 593,
      "samples": 9,
      "dfsCalls": 211,
      "dfsChecks": 956,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-300-304/greaterThan:normal:303/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 3670.8566,
      "cpuTotalMs": 6109,
      "samples": 36,
      "dfsCalls": 20270,
      "dfsChecks": 114466,
      "diagStatus": "complete",
      "diagWallMs": 125.4966000000004,
      "problems": []
    },
    {
      "key": "IG-S09/normal-300-304/greaterThan:normal:303/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 3757.3328999999994,
      "cpuTotalMs": 6031,
      "samples": 36,
      "dfsCalls": 23747,
      "dfsChecks": 114796,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-300-304/greaterThan:normal:304/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 271.84389999999985,
      "cpuTotalMs": 577,
      "samples": 9,
      "dfsCalls": 1030,
      "dfsChecks": 493,
      "diagStatus": "complete",
      "diagWallMs": 107.19779999999992,
      "problems": []
    },
    {
      "key": "IG-S09/normal-300-304/greaterThan:normal:304/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 234.1918999999998,
      "cpuTotalMs": 546,
      "samples": 9,
      "dfsCalls": 104,
      "dfsChecks": 387,
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
      "IG-S09/normal-300-304/greaterThan:normal:300/g0",
      "IG-S09/normal-300-304/greaterThan:normal:300/g1",
      "IG-S09/normal-300-304/greaterThan:normal:301/g1",
      "IG-S09/normal-300-304/greaterThan:normal:301/g0",
      "IG-S09/normal-300-304/greaterThan:normal:302/g0",
      "IG-S09/normal-300-304/greaterThan:normal:302/g1",
      "IG-S09/normal-300-304/greaterThan:normal:303/g1",
      "IG-S09/normal-300-304/greaterThan:normal:303/g0",
      "IG-S09/normal-300-304/greaterThan:normal:304/g0",
      "IG-S09/normal-300-304/greaterThan:normal:304/g1"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
