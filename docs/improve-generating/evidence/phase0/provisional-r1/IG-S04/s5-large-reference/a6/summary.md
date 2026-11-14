# IG-S04 / s5-large-reference (provisional-r1, a6)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: provisional; judged in the task summary (the pilot measures cost and exact hits per variant; it decides neither S1 nor the bank route).

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 2 | 2 | 0 | 0 | 0 | true |

Exclusions: one sample (ordinal 1) per mode on each pilot grid: not a default request and not a qualification; the unmeasured catalogue probe, the independent verifier and the S2 audit are outside every generation time; a censored, budget-stopped or unverified trial proves neither a hit nor a zero rate

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | 694eea9bf608f949a057eb7262cd257445429ed1e86bb8e486e39ea539cf6401 |
| adapters | frontier-hooks |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Task details

```json
{
  "arms": [
    {
      "id": "proposal-only",
      "kind": "native",
      "description": "native digLevel sample of the proposal kind at ordinal 1 (fork dig#1.1), native caps and keeper"
    },
    {
      "id": "ordinary-only",
      "kind": "native",
      "description": "native digLevel sample of the ordinary (score-targeted) kind at ordinal 1 (fork dig#1.1), native caps"
    },
    {
      "id": "F0",
      "kind": "frontier",
      "description": "full ladder (cheap, middle, full floor), S2 off, final parent, no extra filter"
    },
    {
      "id": "F1",
      "kind": "frontier",
      "description": "full ladder, S2 on, final parent, no extra filter (the default frontier)"
    },
    {
      "id": "FC",
      "kind": "frontier",
      "description": "cheap floor only (basic, locked, subset, wing), S2 on, final parent"
    },
    {
      "id": "FM",
      "kind": "frontier",
      "description": "middle floor only (cheap plus fish and the single-digit patterns), S2 on, final parent"
    },
    {
      "id": "FU",
      "kind": "frontier",
      "description": "full ladder, S2 on, final parent, then after the fresh uniqueness proof the full canonical floor with uniqueness enabled filters floor-solvable entries"
    },
    {
      "id": "FS",
      "kind": "frontier",
      "description": "full ladder, S2 on, the stored immutable snapshot of each entry as its reference parent"
    }
  ],
  "identity": {
    "pairs": [
      {
        "pairId": "mega16:11",
        "verdict": "identity-ok",
        "problems": [],
        "gridHash": "7a83cf6b10cd6806d3d2f4b70a196eb1ee8a201ca3f778e3687f6a6a804c7b6d",
        "trials": 2
      },
      {
        "pairId": "mega16:12",
        "verdict": "identity-ok",
        "problems": [],
        "gridHash": "4033d980da910122316cfaae7ec6e6dc01f3f9107b060e4af9f6f5a99fcf9b73",
        "trials": 2
      },
      {
        "pairId": "samurai:11",
        "verdict": "identity-ok",
        "problems": [],
        "gridHash": "dce29b64a0cd5ba1b8ea95afede9dca99411196477bd26ea65b34e7dd4708a6c",
        "trials": 2
      },
      {
        "pairId": "samurai:12",
        "verdict": "identity-ok",
        "problems": [],
        "gridHash": "f2273c77cc40ecc12ef60ce9bff3432b5ab32de540ce4f601ddb0a2ee12e31a9",
        "trials": 2
      }
    ],
    "failed": 0,
    "ok": 4,
    "deferred": 0,
    "complete": true
  },
  "trials": [
    {
      "key": "IG-S04/s5-large-reference/mega16:nightmare:11/FU",
      "cell": "mega16",
      "seed": 11,
      "mode": "FU",
      "outcome": "complete",
      "readyWallMs": 256.15560000000005,
      "readyOccupiedWallMs": 259.3108,
      "cpuReadyTotalMs": 437,
      "coldWallMs": 357.0219000000001,
      "gridBuildWallMs": 13.121599999999944,
      "claimedExact": false,
      "verifiedExact": false,
      "counts": {
        "floorTests": 137,
        "floorDeductions": 7125,
        "solverChecks": 75532,
        "dfsEntries": 10463,
        "dfsChecks": 10352,
        "ladderPasses": 3,
        "phaseBSolves": 0,
        "deepenProposals": 0,
        "verificationSolves": 1,
        "canonicalRatings": 1,
        "phaseBTries": 0,
        "fuFilterSolves": 0
      },
      "budgetStop": null,
      "best": {
        "source": "fallback",
        "quality": 6001,
        "exact": false,
        "uniqueness": "full-grid",
        "level": "veryEasy",
        "score": 0,
        "solved": true,
        "hardestTechnique": null,
        "entry": null,
        "clues": 256
      },
      "censoredProgress": null
    },
    {
      "key": "IG-S04/s5-large-reference/mega16:nightmare:11/FS",
      "cell": "mega16",
      "seed": 11,
      "mode": "FS",
      "outcome": "complete",
      "readyWallMs": 255.3062,
      "readyOccupiedWallMs": 257.62390000000005,
      "cpuReadyTotalMs": 547,
      "coldWallMs": 356.36400000000003,
      "gridBuildWallMs": 13.605199999999968,
      "claimedExact": false,
      "verifiedExact": false,
      "counts": {
        "floorTests": 137,
        "floorDeductions": 7125,
        "solverChecks": 75532,
        "dfsEntries": 10463,
        "dfsChecks": 10352,
        "ladderPasses": 3,
        "phaseBSolves": 0,
        "deepenProposals": 0,
        "verificationSolves": 1,
        "canonicalRatings": 1,
        "phaseBTries": 0,
        "fuFilterSolves": 0
      },
      "budgetStop": null,
      "best": {
        "source": "fallback",
        "quality": 6001,
        "exact": false,
        "uniqueness": "full-grid",
        "level": "veryEasy",
        "score": 0,
        "solved": true,
        "hardestTechnique": null,
        "entry": null,
        "clues": 256
      },
      "censoredProgress": null
    },
    {
      "key": "IG-S04/s5-large-reference/mega16:nightmare:12/FS",
      "cell": "mega16",
      "seed": 12,
      "mode": "FS",
      "outcome": "complete",
      "readyWallMs": 98.4022,
      "readyOccupiedWallMs": 100.89009999999996,
      "cpuReadyTotalMs": 234,
      "coldWallMs": 192.05830000000003,
      "gridBuildWallMs": 13.4842000000001,
      "claimedExact": false,
      "verifiedExact": false,
      "counts": {
        "floorTests": 129,
        "floorDeductions": 6636,
        "solverChecks": 41674,
        "dfsEntries": 1641,
        "dfsChecks": 1542,
        "ladderPasses": 3,
        "phaseBSolves": 0,
        "deepenProposals": 0,
        "verificationSolves": 1,
        "canonicalRatings": 1,
        "phaseBTries": 0,
        "fuFilterSolves": 0
      },
      "budgetStop": null,
      "best": {
        "source": "fallback",
        "quality": 6001,
        "exact": false,
        "uniqueness": "full-grid",
        "level": "veryEasy",
        "score": 0,
        "solved": true,
        "hardestTechnique": null,
        "entry": null,
        "clues": 256
      },
      "censoredProgress": null
    },
    {
      "key": "IG-S04/s5-large-reference/mega16:nightmare:12/FU",
      "cell": "mega16",
      "seed": 12,
      "mode": "FU",
      "outcome": "complete",
      "readyWallMs": 85.47609999999986,
      "readyOccupiedWallMs": 87.65210000000002,
      "cpuReadyTotalMs": 187,
      "coldWallMs": 178.00250000000005,
      "gridBuildWallMs": 12.279600000000073,
      "claimedExact": false,
      "verifiedExact": false,
      "counts": {
        "floorTests": 129,
        "floorDeductions": 6636,
        "solverChecks": 41674,
        "dfsEntries": 1641,
        "dfsChecks": 1542,
        "ladderPasses": 3,
        "phaseBSolves": 0,
        "deepenProposals": 0,
        "verificationSolves": 1,
        "canonicalRatings": 1,
        "phaseBTries": 0,
        "fuFilterSolves": 0
      },
      "budgetStop": null,
      "best": {
        "source": "fallback",
        "quality": 6001,
        "exact": false,
        "uniqueness": "full-grid",
        "level": "veryEasy",
        "score": 0,
        "solved": true,
        "hardestTechnique": null,
        "entry": null,
        "clues": 256
      },
      "censoredProgress": null
    },
    {
      "key": "IG-S04/s5-large-reference/samurai:nightmare:11/FU",
      "cell": "samurai",
      "seed": 11,
      "mode": "FU",
      "outcome": "complete",
      "readyWallMs": 116.92409999999995,
      "readyOccupiedWallMs": 122.38649999999996,
      "cpuReadyTotalMs": 313,
      "coldWallMs": 210.65089999999998,
      "gridBuildWallMs": 13.33929999999998,
      "claimedExact": false,
      "verifiedExact": false,
      "counts": {
        "floorTests": 188,
        "floorDeductions": 22084,
        "solverChecks": 134712,
        "dfsEntries": 438,
        "dfsChecks": 327,
        "ladderPasses": 3,
        "phaseBSolves": 0,
        "deepenProposals": 0,
        "verificationSolves": 1,
        "canonicalRatings": 1,
        "phaseBTries": 0,
        "fuFilterSolves": 0
      },
      "budgetStop": null,
      "best": {
        "source": "fallback",
        "quality": 6001,
        "exact": false,
        "uniqueness": "full-grid",
        "level": "veryEasy",
        "score": 0,
        "solved": true,
        "hardestTechnique": null,
        "entry": null,
        "clues": 369
      },
      "censoredProgress": null
    },
    {
      "key": "IG-S04/s5-large-reference/samurai:nightmare:11/FS",
      "cell": "samurai",
      "seed": 11,
      "mode": "FS",
      "outcome": "complete",
      "readyWallMs": 139.34709999999995,
      "readyOccupiedWallMs": 144.75530000000003,
      "cpuReadyTotalMs": 406,
      "coldWallMs": 244.92089999999996,
      "gridBuildWallMs": 14.153300000000058,
      "claimedExact": false,
      "verifiedExact": false,
      "counts": {
        "floorTests": 188,
        "floorDeductions": 22084,
        "solverChecks": 134712,
        "dfsEntries": 438,
        "dfsChecks": 327,
        "ladderPasses": 3,
        "phaseBSolves": 0,
        "deepenProposals": 0,
        "verificationSolves": 1,
        "canonicalRatings": 1,
        "phaseBTries": 0,
        "fuFilterSolves": 0
      },
      "budgetStop": null,
      "best": {
        "source": "fallback",
        "quality": 6001,
        "exact": false,
        "uniqueness": "full-grid",
        "level": "veryEasy",
        "score": 0,
        "solved": true,
        "hardestTechnique": null,
        "entry": null,
        "clues": 369
      },
      "censoredProgress": null
    },
    {
      "key": "IG-S04/s5-large-reference/samurai:nightmare:12/FS",
      "cell": "samurai",
      "seed": 12,
      "mode": "FS",
      "outcome": "complete",
      "readyWallMs": 169.05600000000004,
      "readyOccupiedWallMs": 173.92720000000008,
      "cpuReadyTotalMs": 406,
      "coldWallMs": 269.63430000000005,
      "gridBuildWallMs": 14.32120000000009,
      "claimedExact": false,
      "verifiedExact": false,
      "counts": {
        "floorTests": 188,
        "floorDeductions": 21797,
        "solverChecks": 193374,
        "dfsEntries": 955,
        "dfsChecks": 852,
        "ladderPasses": 3,
        "phaseBSolves": 0,
        "deepenProposals": 0,
        "verificationSolves": 1,
        "canonicalRatings": 1,
        "phaseBTries": 0,
        "fuFilterSolves": 0
      },
      "budgetStop": null,
      "best": {
        "source": "fallback",
        "quality": 6001,
        "exact": false,
        "uniqueness": "full-grid",
        "level": "veryEasy",
        "score": 0,
        "solved": true,
        "hardestTechnique": null,
        "entry": null,
        "clues": 369
      },
      "censoredProgress": null
    },
    {
      "key": "IG-S04/s5-large-reference/samurai:nightmare:12/FU",
      "cell": "samurai",
      "seed": 12,
      "mode": "FU",
      "outcome": "complete",
      "readyWallMs": 163.58870000000002,
      "readyOccupiedWallMs": 168.4616000000001,
      "cpuReadyTotalMs": 360,
      "coldWallMs": 256.7785000000001,
      "gridBuildWallMs": 13.295399999999972,
      "claimedExact": false,
      "verifiedExact": false,
      "counts": {
        "floorTests": 188,
        "floorDeductions": 21797,
        "solverChecks": 193374,
        "dfsEntries": 955,
        "dfsChecks": 852,
        "ladderPasses": 3,
        "phaseBSolves": 0,
        "deepenProposals": 0,
        "verificationSolves": 1,
        "canonicalRatings": 1,
        "phaseBTries": 0,
        "fuFilterSolves": 0
      },
      "budgetStop": null,
      "best": {
        "source": "fallback",
        "quality": 6001,
        "exact": false,
        "uniqueness": "full-grid",
        "level": "veryEasy",
        "score": 0,
        "solved": true,
        "hardestTechnique": null,
        "entry": null,
        "clues": 369
      },
      "censoredProgress": null
    }
  ],
  "synthetic": null,
  "reprojection": null,
  "catalogueProbe": {
    "wallMs": 113.3895,
    "cpuMs": 141,
    "note": "unmeasured: loads the engine once per command so no trial carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1",
      "a2",
      "a3",
      "a4",
      "a5",
      "a6"
    ],
    "resumed": true,
    "startedBefore": [
      "IG-S04/s5-large-reference/mega16:nightmare:11/FU",
      "IG-S04/s5-large-reference/mega16:nightmare:11/FS",
      "IG-S04/s5-large-reference/mega16:nightmare:12/FS",
      "IG-S04/s5-large-reference/mega16:nightmare:12/FU",
      "IG-S04/s5-large-reference/samurai:nightmare:11/FU",
      "IG-S04/s5-large-reference/samurai:nightmare:11/FS"
    ],
    "startedHere": [
      "IG-S04/s5-large-reference/samurai:nightmare:12/FS",
      "IG-S04/s5-large-reference/samurai:nightmare:12/FU"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
