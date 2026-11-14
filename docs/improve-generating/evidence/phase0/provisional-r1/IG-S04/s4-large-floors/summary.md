# IG-S04 / s4-large-floors (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **paused-unstarted** (exit 0). Estimate verdict: provisional; judged in the task summary (the pilot measures cost and exact hits per variant; it decides neither S1 nor the bank route).

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 8 | 4 | 0 | 0 | 4 | false |

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
      }
    ],
    "failed": 0,
    "ok": 2,
    "deferred": 0,
    "complete": true
  },
  "trials": [
    {
      "key": "IG-S04/s4-large-floors/mega16:nightmare:11/FC",
      "cell": "mega16",
      "seed": 11,
      "mode": "FC",
      "outcome": "complete",
      "readyWallMs": 622.0387,
      "readyOccupiedWallMs": 624.707,
      "cpuReadyTotalMs": 905,
      "coldWallMs": 717.6441,
      "gridBuildWallMs": 13.970699999999965,
      "claimedExact": false,
      "verifiedExact": false,
      "counts": {
        "floorTests": 128,
        "floorDeductions": 6614,
        "solverChecks": 277828,
        "dfsEntries": 10175,
        "dfsChecks": 10068,
        "ladderPasses": 1,
        "phaseBSolves": 3,
        "deepenProposals": 0,
        "verificationSolves": 4,
        "canonicalRatings": 4,
        "phaseBTries": 6,
        "fuFilterSolves": 0
      },
      "budgetStop": null,
      "best": {
        "source": "phaseB",
        "quality": 0.5,
        "exact": false,
        "uniqueness": "dfs-count",
        "level": "nightmare",
        "score": 2244,
        "solved": true,
        "hardestTechnique": "forcingChain",
        "entry": 50,
        "clues": 102
      },
      "censoredProgress": null
    },
    {
      "key": "IG-S04/s4-large-floors/mega16:nightmare:11/FM",
      "cell": "mega16",
      "seed": 11,
      "mode": "FM",
      "outcome": "complete",
      "readyWallMs": 636.6592,
      "readyOccupiedWallMs": 641.9288999999999,
      "cpuReadyTotalMs": 860,
      "coldWallMs": 729.7246,
      "gridBuildWallMs": 12.373000000000047,
      "claimedExact": false,
      "verifiedExact": false,
      "counts": {
        "floorTests": 128,
        "floorDeductions": 6643,
        "solverChecks": 286694,
        "dfsEntries": 10175,
        "dfsChecks": 10068,
        "ladderPasses": 1,
        "phaseBSolves": 3,
        "deepenProposals": 0,
        "verificationSolves": 4,
        "canonicalRatings": 4,
        "phaseBTries": 6,
        "fuFilterSolves": 0
      },
      "budgetStop": null,
      "best": {
        "source": "phaseB",
        "quality": 0.5,
        "exact": false,
        "uniqueness": "dfs-count",
        "level": "nightmare",
        "score": 2244,
        "solved": true,
        "hardestTechnique": "forcingChain",
        "entry": 50,
        "clues": 102
      },
      "censoredProgress": null
    },
    {
      "key": "IG-S04/s4-large-floors/mega16:nightmare:12/FM",
      "cell": "mega16",
      "seed": 12,
      "mode": "FM",
      "outcome": "complete",
      "readyWallMs": 110.69419999999991,
      "readyOccupiedWallMs": 112.8451,
      "cpuReadyTotalMs": 219,
      "coldWallMs": 203.23219999999992,
      "gridBuildWallMs": 11.826900000000023,
      "claimedExact": false,
      "verifiedExact": false,
      "counts": {
        "floorTests": 128,
        "floorDeductions": 6618,
        "solverChecks": 51403,
        "dfsEntries": 1641,
        "dfsChecks": 1542,
        "ladderPasses": 1,
        "phaseBSolves": 0,
        "deepenProposals": 0,
        "verificationSolves": 1,
        "canonicalRatings": 1,
        "phaseBTries": 1,
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
      "key": "IG-S04/s4-large-floors/mega16:nightmare:12/FC",
      "cell": "mega16",
      "seed": 12,
      "mode": "FC",
      "outcome": "complete",
      "readyWallMs": 79.50469999999996,
      "readyOccupiedWallMs": 81.74940000000015,
      "cpuReadyTotalMs": 140,
      "coldWallMs": 170.9402,
      "gridBuildWallMs": 11.47400000000016,
      "claimedExact": false,
      "verifiedExact": false,
      "counts": {
        "floorTests": 128,
        "floorDeductions": 6592,
        "solverChecks": 40256,
        "dfsEntries": 1641,
        "dfsChecks": 1542,
        "ladderPasses": 1,
        "phaseBSolves": 0,
        "deepenProposals": 0,
        "verificationSolves": 1,
        "canonicalRatings": 1,
        "phaseBTries": 1,
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
      "key": "IG-S04/s4-large-floors/samurai:nightmare:11/FC",
      "cell": "samurai",
      "seed": 11,
      "mode": "FC",
      "outcome": "unstarted",
      "readyWallMs": null,
      "readyOccupiedWallMs": null,
      "cpuReadyTotalMs": null,
      "coldWallMs": null,
      "gridBuildWallMs": null,
      "claimedExact": null,
      "verifiedExact": null,
      "counts": {
        "floorTests": null,
        "floorDeductions": null,
        "solverChecks": null,
        "dfsEntries": null,
        "dfsChecks": null,
        "ladderPasses": null,
        "phaseBSolves": null,
        "deepenProposals": null,
        "verificationSolves": null
      },
      "budgetStop": null,
      "best": null,
      "censoredProgress": null
    },
    {
      "key": "IG-S04/s4-large-floors/samurai:nightmare:11/FM",
      "cell": "samurai",
      "seed": 11,
      "mode": "FM",
      "outcome": "unstarted",
      "readyWallMs": null,
      "readyOccupiedWallMs": null,
      "cpuReadyTotalMs": null,
      "coldWallMs": null,
      "gridBuildWallMs": null,
      "claimedExact": null,
      "verifiedExact": null,
      "counts": {
        "floorTests": null,
        "floorDeductions": null,
        "solverChecks": null,
        "dfsEntries": null,
        "dfsChecks": null,
        "ladderPasses": null,
        "phaseBSolves": null,
        "deepenProposals": null,
        "verificationSolves": null
      },
      "budgetStop": null,
      "best": null,
      "censoredProgress": null
    },
    {
      "key": "IG-S04/s4-large-floors/samurai:nightmare:12/FM",
      "cell": "samurai",
      "seed": 12,
      "mode": "FM",
      "outcome": "unstarted",
      "readyWallMs": null,
      "readyOccupiedWallMs": null,
      "cpuReadyTotalMs": null,
      "coldWallMs": null,
      "gridBuildWallMs": null,
      "claimedExact": null,
      "verifiedExact": null,
      "counts": {
        "floorTests": null,
        "floorDeductions": null,
        "solverChecks": null,
        "dfsEntries": null,
        "dfsChecks": null,
        "ladderPasses": null,
        "phaseBSolves": null,
        "deepenProposals": null,
        "verificationSolves": null
      },
      "budgetStop": null,
      "best": null,
      "censoredProgress": null
    },
    {
      "key": "IG-S04/s4-large-floors/samurai:nightmare:12/FC",
      "cell": "samurai",
      "seed": 12,
      "mode": "FC",
      "outcome": "unstarted",
      "readyWallMs": null,
      "readyOccupiedWallMs": null,
      "cpuReadyTotalMs": null,
      "coldWallMs": null,
      "gridBuildWallMs": null,
      "claimedExact": null,
      "verifiedExact": null,
      "counts": {
        "floorTests": null,
        "floorDeductions": null,
        "solverChecks": null,
        "dfsEntries": null,
        "dfsChecks": null,
        "ladderPasses": null,
        "phaseBSolves": null,
        "deepenProposals": null,
        "verificationSolves": null
      },
      "budgetStop": null,
      "best": null,
      "censoredProgress": null
    }
  ],
  "synthetic": null,
  "reprojection": null,
  "catalogueProbe": {
    "wallMs": 109.6096,
    "cpuMs": 109,
    "note": "unmeasured: loads the engine once per command so no trial carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S04/s4-large-floors/mega16:nightmare:11/FC",
      "IG-S04/s4-large-floors/mega16:nightmare:11/FM",
      "IG-S04/s4-large-floors/mega16:nightmare:12/FM",
      "IG-S04/s4-large-floors/mega16:nightmare:12/FC"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": [
      "IG-S04/s4-large-floors/samurai:nightmare:11/FC",
      "IG-S04/s4-large-floors/samurai:nightmare:11/FM",
      "IG-S04/s4-large-floors/samurai:nightmare:12/FM",
      "IG-S04/s4-large-floors/samurai:nightmare:12/FC"
    ]
  }
}
```
