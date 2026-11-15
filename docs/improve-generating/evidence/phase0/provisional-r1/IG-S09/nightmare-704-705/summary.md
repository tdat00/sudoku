# IG-S09 / nightmare-704-705 (provisional-r1, a1)

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
| greaterThan:nightmare:704 | 326.290 | 450.107 | 656 | 854.545 | 964.786 | 1343 | 2.047 | 2.619 | 2.143 |
| greaterThan:nightmare:705 | 11570.513 | 11690.277 | 15813 | 60496.857 | 60603.785 | 64313 | 4.067 | 5.229 | 5.184 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 2 | 326.290 | 11570.513 | 11570.513 | 11570.513 |
| cold wall ms | 2 | 450.107 | 11690.277 | 11690.277 | 11690.277 |
| cpu total ms | 2 | 656 | 15813 | 15813 | 15813 |

Requests 2, complete 2, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 2; per CPU second 0.121 (all spent CPU 16469 ms, resolved); per cold wall second 0.164 (all spent wall 12176.926 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 2 | 16469 | 12176.926 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 2 | 16469 | 12176.926 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 2 | 854.545 | 60496.857 | 60496.857 | 60496.857 |
| cold wall ms | 2 | 964.786 | 60603.785 | 60603.785 | 60603.785 |
| cpu total ms | 2 | 1343 | 64313 | 64313 | 64313 |

Requests 2, complete 2, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 2; per CPU second 0.030 (all spent CPU 65656 ms, resolved); per cold wall second 0.032 (all spent wall 61587.503 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 2 | 65656 | 61587.503 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 2 | 65656 | 61587.503 |

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
        "pairId": "greaterThan:nightmare:704",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 1,
        "passes": 6,
        "removals": 158,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "9809e5429e9e1d4074bd59c755ba1d05cfd3ee8bed8d310cd4fc3d51773f29e3",
        "g1Digest": "9809e5429e9e1d4074bd59c755ba1d05cfd3ee8bed8d310cd4fc3d51773f29e3"
      },
      {
        "pairId": "greaterThan:nightmare:705",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 43,
        "passes": 236,
        "removals": 6662,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "a190106673ec8fdb9a9d689bbc0a8822cbc99784b1d34e1920baada49bdf0a3a",
        "g1Digest": "a190106673ec8fdb9a9d689bbc0a8822cbc99784b1d34e1920baada49bdf0a3a"
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
      "key": "IG-S09/nightmare-704-705/greaterThan:nightmare:704/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 326.2899000000001,
      "cpuTotalMs": 656,
      "samples": 1,
      "dfsCalls": 162,
      "dfsChecks": 1121,
      "diagStatus": "complete",
      "diagWallMs": 101.68920000000003,
      "problems": []
    },
    {
      "key": "IG-S09/nightmare-704-705/greaterThan:nightmare:704/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 854.5453000000002,
      "cpuTotalMs": 1343,
      "samples": 1,
      "dfsCalls": 65,
      "dfsChecks": 830,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/nightmare-704-705/greaterThan:nightmare:705/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 60496.8566,
      "cpuTotalMs": 64313,
      "samples": 43,
      "dfsCalls": 32350,
      "dfsChecks": 186253,
      "diagStatus": "complete",
      "diagWallMs": 201.14910000000236,
      "problems": []
    },
    {
      "key": "IG-S09/nightmare-704-705/greaterThan:nightmare:705/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 11570.51260000001,
      "cpuTotalMs": 15813,
      "samples": 43,
      "dfsCalls": 36077,
      "dfsChecks": 203716,
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
      "IG-S09/nightmare-704-705/greaterThan:nightmare:704/g0",
      "IG-S09/nightmare-704-705/greaterThan:nightmare:704/g1",
      "IG-S09/nightmare-704-705/greaterThan:nightmare:705/g1",
      "IG-S09/nightmare-704-705/greaterThan:nightmare:705/g0"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
