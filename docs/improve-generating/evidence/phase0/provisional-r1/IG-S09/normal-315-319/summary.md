# IG-S09 / normal-315-319 (provisional-r1, a1)

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
| greaterThan:normal:315 | 3782.604 | 3890.662 | 6344 | 3911.995 | 4035.108 | 6329 | 0.998 | 1.034 | 1.037 |
| greaterThan:normal:316 | 3891.606 | 3998.113 | 6390 | 3591.964 | 3700.889 | 5406 | 0.846 | 0.923 | 0.926 |
| greaterThan:normal:317 | 1692.706 | 1798.454 | 2922 | 1744.400 | 1852.796 | 3079 | 1.054 | 1.031 | 1.030 |
| greaterThan:normal:318 | 5318.054 | 5430.587 | 8453 | 5245.070 | 5350.292 | 9187 | 1.087 | 0.986 | 0.985 |
| greaterThan:normal:319 | 405.825 | 511.708 | 969 | 364.028 | 483.894 | 703 | 0.725 | 0.897 | 0.946 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 5 | 3782.604 | 5318.054 | 5318.054 | 3782.604 |
| cold wall ms | 5 | 3890.662 | 5430.587 | 5430.587 | 3890.662 |
| cpu total ms | 5 | 6344 | 8453 | 8453 | 6344 |

Requests 5, complete 5, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 5; per CPU second 0.199 (all spent CPU 25078 ms, resolved); per cold wall second 0.317 (all spent wall 15758.643 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 5 | 25078 | 15758.643 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 5 | 25078 | 15758.643 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 5 | 3591.964 | 5245.070 | 5245.070 | 3591.964 |
| cold wall ms | 5 | 3700.889 | 5350.292 | 5350.292 | 3700.889 |
| cpu total ms | 5 | 5406 | 9187 | 9187 | 5406 |

Requests 5, complete 5, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 5; per CPU second 0.202 (all spent CPU 24704 ms, resolved); per cold wall second 0.322 (all spent wall 15534.679 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 5 | 24704 | 15534.679 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 5 | 24704 | 15534.679 |

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
        "pairId": "greaterThan:normal:315",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 36,
        "passes": 78,
        "removals": 3895,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "11418e4ce97927a781b54b3283b65836e1b5a3f68abe37c7eac576b440b61430",
        "g1Digest": "11418e4ce97927a781b54b3283b65836e1b5a3f68abe37c7eac576b440b61430"
      },
      {
        "pairId": "greaterThan:normal:316",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 32,
        "passes": 76,
        "removals": 3534,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "70950a0faaf5eb6828dfa19f219d3319c570d26773c39910e2a393ece5041ed0",
        "g1Digest": "70950a0faaf5eb6828dfa19f219d3319c570d26773c39910e2a393ece5041ed0"
      },
      {
        "pairId": "greaterThan:normal:317",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 14,
        "passes": 48,
        "removals": 1619,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "24aca0a48d2f96f03944994533f4b0c8a3584d2a3e19b7966b5763d98fd1bdf8",
        "g1Digest": "24aca0a48d2f96f03944994533f4b0c8a3584d2a3e19b7966b5763d98fd1bdf8"
      },
      {
        "pairId": "greaterThan:normal:318",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 52,
        "passes": 146,
        "removals": 5673,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "de33dd5a90b21633dae58e59356e05b459aa009f30be3afd39dbd54a3a644f3c",
        "g1Digest": "de33dd5a90b21633dae58e59356e05b459aa009f30be3afd39dbd54a3a644f3c"
      },
      {
        "pairId": "greaterThan:normal:319",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 13,
        "passes": 46,
        "removals": 1495,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "793dd97dd5cf9a93d9f9d53c3711a22d36b6a59f66acb4a4d1024afb7deab73d",
        "g1Digest": "793dd97dd5cf9a93d9f9d53c3711a22d36b6a59f66acb4a4d1024afb7deab73d"
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
      "key": "IG-S09/normal-315-319/greaterThan:normal:315/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 3911.9947999999995,
      "cpuTotalMs": 6329,
      "samples": 36,
      "dfsCalls": 20015,
      "dfsChecks": 119423,
      "diagStatus": "complete",
      "diagWallMs": 127.98099999999977,
      "problems": []
    },
    {
      "key": "IG-S09/normal-315-319/greaterThan:normal:315/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 3782.6039999999994,
      "cpuTotalMs": 6344,
      "samples": 36,
      "dfsCalls": 23502,
      "dfsChecks": 119532,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-315-319/greaterThan:normal:316/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 3891.6057999999994,
      "cpuTotalMs": 6390,
      "samples": 32,
      "dfsCalls": 23342,
      "dfsChecks": 112254,
      "diagStatus": "complete",
      "diagWallMs": 132.09460000000036,
      "problems": []
    },
    {
      "key": "IG-S09/normal-315-319/greaterThan:normal:316/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 3591.9644000000008,
      "cpuTotalMs": 5406,
      "samples": 32,
      "dfsCalls": 20312,
      "dfsChecks": 111980,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-315-319/greaterThan:normal:317/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 1744.3999000000003,
      "cpuTotalMs": 3079,
      "samples": 14,
      "dfsCalls": 10190,
      "dfsChecks": 42410,
      "diagStatus": "complete",
      "diagWallMs": 107.16290000000299,
      "problems": []
    },
    {
      "key": "IG-S09/normal-315-319/greaterThan:normal:317/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 1692.7055,
      "cpuTotalMs": 2922,
      "samples": 14,
      "dfsCalls": 11503,
      "dfsChecks": 42582,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-315-319/greaterThan:normal:318/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 5318.054199999999,
      "cpuTotalMs": 8453,
      "samples": 52,
      "dfsCalls": 35211,
      "dfsChecks": 168800,
      "diagStatus": "complete",
      "diagWallMs": 127.34319999999934,
      "problems": []
    },
    {
      "key": "IG-S09/normal-315-319/greaterThan:normal:318/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 5245.070100000001,
      "cpuTotalMs": 9187,
      "samples": 52,
      "dfsCalls": 30283,
      "dfsChecks": 168333,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-315-319/greaterThan:normal:319/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 364.02750000000015,
      "cpuTotalMs": 703,
      "samples": 13,
      "dfsCalls": 292,
      "dfsChecks": 1122,
      "diagStatus": "complete",
      "diagWallMs": 107.97850000000108,
      "problems": []
    },
    {
      "key": "IG-S09/normal-315-319/greaterThan:normal:319/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 405.82530000000406,
      "cpuTotalMs": 969,
      "samples": 13,
      "dfsCalls": 1512,
      "dfsChecks": 1282,
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
      "IG-S09/normal-315-319/greaterThan:normal:315/g1",
      "IG-S09/normal-315-319/greaterThan:normal:315/g0",
      "IG-S09/normal-315-319/greaterThan:normal:316/g0",
      "IG-S09/normal-315-319/greaterThan:normal:316/g1",
      "IG-S09/normal-315-319/greaterThan:normal:317/g1",
      "IG-S09/normal-315-319/greaterThan:normal:317/g0",
      "IG-S09/normal-315-319/greaterThan:normal:318/g0",
      "IG-S09/normal-315-319/greaterThan:normal:318/g1",
      "IG-S09/normal-315-319/greaterThan:normal:319/g1",
      "IG-S09/normal-315-319/greaterThan:normal:319/g0"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
