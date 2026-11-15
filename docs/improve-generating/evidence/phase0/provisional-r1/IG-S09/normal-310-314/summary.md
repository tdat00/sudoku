# IG-S09 / normal-310-314 (provisional-r1, a1)

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
| greaterThan:normal:310 | 7494.082 | 7619.686 | 12704 | 6893.196 | 7003.913 | 11688 | 0.920 | 0.920 | 0.919 |
| greaterThan:normal:311 | 126.463 | 234.965 | 454 | 112.620 | 222.118 | 359 | 0.791 | 0.891 | 0.945 |
| greaterThan:normal:312 | 214.358 | 320.836 | 563 | 181.410 | 286.294 | 423 | 0.751 | 0.846 | 0.892 |
| greaterThan:normal:313 | 3856.883 | 3966.130 | 5922 | 3832.492 | 3939.357 | 6266 | 1.058 | 0.994 | 0.993 |
| greaterThan:normal:314 | 393.736 | 498.130 | 703 | 346.542 | 451.248 | 719 | 1.023 | 0.880 | 0.906 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 5 | 393.736 | 7494.082 | 7494.082 | 393.736 |
| cold wall ms | 5 | 498.130 | 7619.686 | 7619.686 | 498.130 |
| cpu total ms | 5 | 703 | 12704 | 12704 | 703 |

Requests 5, complete 5, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 5; per CPU second 0.246 (all spent CPU 20346 ms, resolved); per cold wall second 0.393 (all spent wall 12727.244 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 5 | 20346 | 12727.244 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 5 | 20346 | 12727.244 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 5 | 346.542 | 6893.196 | 6893.196 | 346.542 |
| cold wall ms | 5 | 451.248 | 7003.913 | 7003.913 | 451.248 |
| cpu total ms | 5 | 719 | 11688 | 11688 | 719 |

Requests 5, complete 5, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 5; per CPU second 0.257 (all spent CPU 19455 ms, resolved); per cold wall second 0.417 (all spent wall 11981.074 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 5 | 19455 | 11981.074 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 5 | 19455 | 11981.074 |

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
        "pairId": "greaterThan:normal:310",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 61,
        "passes": 146,
        "removals": 6674,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "a4707fdcdd2927b80af906907d0c03a9b3c229f9fdce4257b85db8afbde9b7db",
        "g1Digest": "a4707fdcdd2927b80af906907d0c03a9b3c229f9fdce4257b85db8afbde9b7db"
      },
      {
        "pairId": "greaterThan:normal:311",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 3,
        "passes": 10,
        "removals": 358,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "42330a71835a07b07a8cb2c6660bb5427a46c05971f90a4a43c494c12d2cdf65",
        "g1Digest": "42330a71835a07b07a8cb2c6660bb5427a46c05971f90a4a43c494c12d2cdf65"
      },
      {
        "pairId": "greaterThan:normal:312",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 6,
        "passes": 14,
        "removals": 699,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "ef70440d501518429dd2ac9b230609bddf12dc31a721e0733bbc2de1b780d416",
        "g1Digest": "ef70440d501518429dd2ac9b230609bddf12dc31a721e0733bbc2de1b780d416"
      },
      {
        "pairId": "greaterThan:normal:313",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 34,
        "passes": 78,
        "removals": 3733,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "cbec061b34eb4e2dc6427217f6b77365a135a231fe72f94b12fe7aa277f78ac0",
        "g1Digest": "cbec061b34eb4e2dc6427217f6b77365a135a231fe72f94b12fe7aa277f78ac0"
      },
      {
        "pairId": "greaterThan:normal:314",
        "kind": "arms",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "samples": 12,
        "passes": 28,
        "removals": 1395,
        "budgetPresent": false,
        "firstDifference": null,
        "g0Digest": "1ad2a10137962037c7472a409989c69fa5d67a0b2492a0e78b0fa24d72e74967",
        "g1Digest": "1ad2a10137962037c7472a409989c69fa5d67a0b2492a0e78b0fa24d72e74967"
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
      "key": "IG-S09/normal-310-314/greaterThan:normal:310/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 7494.0819,
      "cpuTotalMs": 12704,
      "samples": 61,
      "dfsCalls": 46106,
      "dfsChecks": 155721,
      "diagStatus": "complete",
      "diagWallMs": 150.54999999999927,
      "problems": []
    },
    {
      "key": "IG-S09/normal-310-314/greaterThan:normal:310/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 6893.196399999999,
      "cpuTotalMs": 11688,
      "samples": 61,
      "dfsCalls": 40297,
      "dfsChecks": 155466,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-310-314/greaterThan:normal:311/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 112.6202000000012,
      "cpuTotalMs": 359,
      "samples": 3,
      "dfsCalls": 56,
      "dfsChecks": 162,
      "diagStatus": "complete",
      "diagWallMs": 101.26909999999953,
      "problems": []
    },
    {
      "key": "IG-S09/normal-310-314/greaterThan:normal:311/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 126.46270000000004,
      "cpuTotalMs": 454,
      "samples": 3,
      "dfsCalls": 363,
      "dfsChecks": 173,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-310-314/greaterThan:normal:312/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 214.35819999999876,
      "cpuTotalMs": 563,
      "samples": 6,
      "dfsCalls": 708,
      "dfsChecks": 537,
      "diagStatus": "complete",
      "diagWallMs": 108.90229999999792,
      "problems": []
    },
    {
      "key": "IG-S09/normal-310-314/greaterThan:normal:312/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 181.41020000000208,
      "cpuTotalMs": 423,
      "samples": 6,
      "dfsCalls": 96,
      "dfsChecks": 424,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-310-314/greaterThan:normal:313/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 3832.4915,
      "cpuTotalMs": 6266,
      "samples": 34,
      "dfsCalls": 20263,
      "dfsChecks": 115551,
      "diagStatus": "complete",
      "diagWallMs": 125.68930000000182,
      "problems": []
    },
    {
      "key": "IG-S09/normal-310-314/greaterThan:normal:313/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 3856.8829000000005,
      "cpuTotalMs": 5922,
      "samples": 34,
      "dfsCalls": 23532,
      "dfsChecks": 115812,
      "diagStatus": "reused-only",
      "diagWallMs": null,
      "problems": []
    },
    {
      "key": "IG-S09/normal-310-314/greaterThan:normal:314/g0",
      "arm": "g0",
      "outcome": "complete",
      "readyWallMs": 393.73639999999796,
      "cpuTotalMs": 703,
      "samples": 12,
      "dfsCalls": 1410,
      "dfsChecks": 1103,
      "diagStatus": "complete",
      "diagWallMs": 114.99029999999766,
      "problems": []
    },
    {
      "key": "IG-S09/normal-310-314/greaterThan:normal:314/g1",
      "arm": "g1",
      "outcome": "complete",
      "readyWallMs": 346.54209999999875,
      "cpuTotalMs": 719,
      "samples": 12,
      "dfsCalls": 192,
      "dfsChecks": 842,
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
      "IG-S09/normal-310-314/greaterThan:normal:310/g0",
      "IG-S09/normal-310-314/greaterThan:normal:310/g1",
      "IG-S09/normal-310-314/greaterThan:normal:311/g1",
      "IG-S09/normal-310-314/greaterThan:normal:311/g0",
      "IG-S09/normal-310-314/greaterThan:normal:312/g0",
      "IG-S09/normal-310-314/greaterThan:normal:312/g1",
      "IG-S09/normal-310-314/greaterThan:normal:313/g1",
      "IG-S09/normal-310-314/greaterThan:normal:313/g0",
      "IG-S09/normal-310-314/greaterThan:normal:314/g0",
      "IG-S09/normal-310-314/greaterThan:normal:314/g1"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
