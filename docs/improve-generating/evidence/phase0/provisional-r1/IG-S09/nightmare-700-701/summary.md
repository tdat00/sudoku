# IG-S09 / nightmare-700-701 (provisional-r1, a1)

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
| greaterThan:nightmare:700 | 12089.153 | 12215.056 | 15578 | 67782.935 | 67891.778 | 71094 | 4.564 | 5.607 | 5.558 |
| greaterThan:nightmare:701 | 16291.105 | 16395.736 | 21484 | 100844.696 | 100950.286 | 104781 | 4.877 | 6.190 | 6.157 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 2 | 12089.153 | 16291.105 | 16291.105 | 16291.105 |
| cold wall ms | 2 | 12215.056 | 16395.736 | 16395.736 | 16395.736 |
| cpu total ms | 2 | 15578 | 21484 | 21484 | 21484 |

Requests 2, complete 2, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 2; per CPU second 0.054 (all spent CPU 37062 ms, resolved); per cold wall second 0.070 (all spent wall 28663.923 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 2 | 37062 | 28663.923 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 2 | 37062 | 28663.923 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 2 | 67782.935 | 100844.696 | 100844.696 | 100844.696 |
| cold wall ms | 2 | 67891.778 | 100950.286 | 100950.286 | 100950.286 |
| cpu total ms | 2 | 71094 | 104781 | 104781 | 104781 |

Requests 2, complete 2, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 2; per CPU second 0.011 (all spent CPU 175875 ms, resolved); per cold wall second 0.012 (all spent wall 168886.699 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 2 | 175875 | 168886.699 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 2 | 175875 | 168886.699 |

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
        "pairId": "greaterThan:nightmare:700",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 46,
        "passes": 278,
        "removals": 7361,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "6332da1ef85c61f60c3de47e49ea733178337a4f43de584e93b394cdec6a64d9",
        "g1Digest": "6332da1ef85c61f60c3de47e49ea733178337a4f43de584e93b394cdec6a64d9"
      },
      {
        "pairId": "greaterThan:nightmare:701",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 56,
        "passes": 320,
        "removals": 8673,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "72274a3e1bbbbfc0b0cc4cc95a353dabf2433df8550a52e5ed7a65ba05b0acce",
        "g1Digest": "72274a3e1bbbbfc0b0cc4cc95a353dabf2433df8550a52e5ed7a65ba05b0acce"
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
      "key": "IG-S09/nightmare-700-701/greaterThan:nightmare:700/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 12089.1529,
      "cpuTotalMs": 15578,
      "samples": 46,
      "dfsCalls": 36873,
      "dfsChecks": 182694,
      "diagStatus": "complete",
      "diagWallMs": 186.1949999999997,
      "problems": []
    },
    {
      "key": "IG-S09/nightmare-700-701/greaterThan:nightmare:700/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 67782.9348,
      "cpuTotalMs": 71094,
      "samples": 46,
      "dfsCalls": 32854,
      "dfsChecks": 169133,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/nightmare-700-701/greaterThan:nightmare:701/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 100844.69559999999,
      "cpuTotalMs": 104781,
      "samples": 56,
      "dfsCalls": 43168,
      "dfsChecks": 277195,
      "diagStatus": "complete",
      "diagWallMs": 186.56649999998626,
      "problems": []
    },
    {
      "key": "IG-S09/nightmare-700-701/greaterThan:nightmare:701/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 16291.105299999996,
      "cpuTotalMs": 21484,
      "samples": 56,
      "dfsCalls": 48044,
      "dfsChecks": 298089,
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
      "IG-S09/nightmare-700-701/greaterThan:nightmare:700/g0",
      "IG-S09/nightmare-700-701/greaterThan:nightmare:700/g1",
      "IG-S09/nightmare-700-701/greaterThan:nightmare:701/g1",
      "IG-S09/nightmare-700-701/greaterThan:nightmare:701/g0"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
