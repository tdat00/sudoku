# IG-S04 / s1-large-controls (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **error** (exit 1). Estimate verdict: provisional; judged in the task summary (the pilot measures cost and exact hits per variant; it decides neither S1 nor the bank route).

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 6 | 0 | 0 | 0 | 6 | false |

Exclusions: one sample (ordinal 1) per mode on each pilot grid: not a default request and not a qualification; the unmeasured catalogue probe, the independent verifier and the S2 audit are outside every generation time; a censored, budget-stopped or unverified trial proves neither a hit nor a zero rate

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | 0db69e8d2e51abc30117a9d405caa7f39893bd3e20c8c2de47504484533049d6 |
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
    "pairs": [],
    "failed": 0,
    "ok": 0,
    "deferred": 0,
    "complete": false
  },
  "trials": [
    {
      "key": "IG-S04/s1-large-controls/mega16:nightmare:11/proposal-only",
      "cell": "mega16",
      "seed": 11,
      "mode": "proposal-only",
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
      "key": "IG-S04/s1-large-controls/mega16:nightmare:11/ordinary-only",
      "cell": "mega16",
      "seed": 11,
      "mode": "ordinary-only",
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
      "key": "IG-S04/s1-large-controls/mega16:nightmare:11/F1",
      "cell": "mega16",
      "seed": 11,
      "mode": "F1",
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
      "key": "IG-S04/s1-large-controls/samurai:nightmare:11/proposal-only",
      "cell": "samurai",
      "seed": 11,
      "mode": "proposal-only",
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
      "key": "IG-S04/s1-large-controls/samurai:nightmare:11/ordinary-only",
      "cell": "samurai",
      "seed": 11,
      "mode": "ordinary-only",
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
      "key": "IG-S04/s1-large-controls/samurai:nightmare:11/F1",
      "cell": "samurai",
      "seed": 11,
      "mode": "F1",
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
  "synthetic": {
    "ok": false,
    "passed": 13,
    "total": 15,
    "workerWallMs": 238.99609999999996,
    "workerCpuMs": 516,
    "results": [
      {
        "id": "engine.hooks-counters",
        "group": "engine",
        "ok": true,
        "title": "the patched engine counts solves, deductions, logical checks and DFS work",
        "ms": 8,
        "detail": {
          "applied": 41,
          "solved": true,
          "checks": 41,
          "dfs": {
            "logicalSolves": 0,
            "deductions": 0,
            "floorDeductions": 0,
            "solverChecks": 0,
            "dfsCalls": 1,
            "dfsEntries": 1,
            "dfsChecks": 0
          }
        }
      },
      {
        "id": "engine.s2-rederivation",
        "group": "engine",
        "ok": true,
        "title": "S2 re-derives removed cells; the ordinal equals an independent full solve",
        "ms": 1,
        "detail": {
          "tried": 1,
          "ordinal": 41,
          "fullSteps": 43,
          "fullStatus": "solved"
        }
      },
      {
        "id": "engine.s2-wrong-value",
        "group": "engine",
        "ok": true,
        "title": "an S2 session with a wrong expected value stops with an unsound deduction",
        "ms": 0,
        "detail": {
          "info": {
            "cell": 2,
            "value": 8,
            "expected": 1,
            "ordinal": 17
          }
        }
      },
      {
        "id": "engine.no-uniqueness-in-phase-a",
        "group": "engine",
        "ok": true,
        "title": "a uniqueness-assuming finder is excluded when uniqueness is not assumed",
        "ms": 1,
        "detail": {
          "cheap": 15,
          "effective": 14
        }
      },
      {
        "id": "engine.trial-FC",
        "group": "engine",
        "ok": true,
        "title": "FC (one cheap pass, S2) on classic9: counts, final parent, audit, restored state",
        "ms": 18,
        "detail": {
          "audit": {
            "accepted": 27,
            "rederived": 25,
            "audited": 3,
            "disagreements": 0,
            "ordinalMatches": [
              true,
              true,
              true
            ]
          },
          "exact": false,
          "level": "veryEasy",
          "score": 0,
          "counts": {
            "floorTests": 41,
            "floorDeductions": 898,
            "solverChecks": 4443,
            "dfsEntries": 87,
            "dfsChecks": 59,
            "ladderPasses": 1,
            "phaseBSolves": 0,
            "deepenProposals": 0,
            "verificationSolves": 1,
            "canonicalRatings": 1,
            "phaseBTries": 0,
            "fuFilterSolves": 0
          },
          "entries": 0
        }
      },
      {
        "id": "engine.trial-F1",
        "group": "engine",
        "ok": true,
        "title": "F1 on classic9 (K_F 1): complete, consistent, audited",
        "ms": 8,
        "detail": {
          "audit": {
            "accepted": 27,
            "rederived": 25,
            "audited": 3,
            "disagreements": 0,
            "ordinalMatches": [
              true,
              true,
              true
            ]
          },
          "exact": false,
          "level": "veryEasy",
          "score": 0,
          "counts": {
            "floorTests": 41,
            "floorDeductions": 898,
            "solverChecks": 4443,
            "dfsEntries": 87,
            "dfsChecks": 59,
            "ladderPasses": 3,
            "phaseBSolves": 0,
            "deepenProposals": 0,
            "verificationSolves": 1,
            "canonicalRatings": 1,
            "phaseBTries": 0,
            "fuFilterSolves": 0
          },
          "entries": 0
        }
      },
      {
        "id": "engine.trial-F0",
        "group": "engine",
        "ok": true,
        "title": "F0 on classic9 (K_F 1): complete, consistent, audited",
        "ms": 6,
        "detail": {
          "audit": {
            "accepted": 27,
            "rederived": 0,
            "audited": 0,
            "disagreements": 0,
            "ordinalMatches": []
          },
          "exact": false,
          "level": "veryEasy",
          "score": 0,
          "counts": {
            "floorTests": 41,
            "floorDeductions": 1067,
            "solverChecks": 4612,
            "dfsEntries": 87,
            "dfsChecks": 59,
            "ladderPasses": 3,
            "phaseBSolves": 0,
            "deepenProposals": 0,
            "verificationSolves": 1,
            "canonicalRatings": 1,
            "phaseBTries": 0,
            "fuFilterSolves": 0
          },
          "entries": 0
        }
      },
      {
        "id": "engine.trial-FM",
        "group": "engine",
        "ok": true,
        "title": "FM on classic9 (K_F 1): complete, consistent, audited",
        "ms": 9,
        "detail": {
          "audit": {
            "accepted": 27,
            "rederived": 25,
            "audited": 3,
            "disagreements": 0,
            "ordinalMatches": [
              true,
              true,
              true
            ]
          },
          "exact": false,
          "level": "veryEasy",
          "score": 0,
          "counts": {
            "floorTests": 41,
            "floorDeductions": 902,
            "solverChecks": 5951,
            "dfsEntries": 87,
            "dfsChecks": 59,
            "ladderPasses": 1,
            "phaseBSolves": 0,
            "deepenProposals": 0,
            "verificationSolves": 1,
            "canonicalRatings": 1,
            "phaseBTries": 0,
            "fuFilterSolves": 0
          },
          "entries": 0
        }
      },
      {
        "id": "engine.trial-FU",
        "group": "engine",
        "ok": true,
        "title": "FU on classic9 (K_F 1): complete, consistent, audited",
        "ms": 6,
        "detail": {
          "audit": {
            "accepted": 27,
            "rederived": 25,
            "audited": 3,
            "disagreements": 0,
            "ordinalMatches": [
              true,
              true,
              true
            ]
          },
          "exact": false,
          "level": "veryEasy",
          "score": 0,
          "counts": {
            "floorTests": 41,
            "floorDeductions": 898,
            "solverChecks": 4443,
            "dfsEntries": 87,
            "dfsChecks": 59,
            "ladderPasses": 3,
            "phaseBSolves": 0,
            "deepenProposals": 0,
            "verificationSolves": 1,
            "canonicalRatings": 1,
            "phaseBTries": 0,
            "fuFilterSolves": 0
          },
          "entries": 0
        }
      },
      {
        "id": "engine.trial-FS",
        "group": "engine",
        "ok": true,
        "title": "FS on classic9 (K_F 1): complete, consistent, audited",
        "ms": 4,
        "detail": {
          "audit": {
            "accepted": 27,
            "rederived": 25,
            "audited": 3,
            "disagreements": 0,
            "ordinalMatches": [
              true,
              true,
              true
            ]
          },
          "exact": false,
          "level": "veryEasy",
          "score": 0,
          "counts": {
            "floorTests": 41,
            "floorDeductions": 898,
            "solverChecks": 4443,
            "dfsEntries": 87,
            "dfsChecks": 59,
            "ladderPasses": 3,
            "phaseBSolves": 0,
            "deepenProposals": 0,
            "verificationSolves": 1,
            "canonicalRatings": 1,
            "phaseBTries": 0,
            "fuFilterSolves": 0
          },
          "entries": 0
        }
      },
      {
        "id": "engine.native-proposal-only",
        "group": "engine",
        "ok": true,
        "title": "proposal-only on classic9: the native sample with its native caps, counted",
        "ms": 8,
        "detail": {
          "exact": false,
          "level": "easy",
          "score": 49,
          "counts": {
            "floorTests": null,
            "floorDeductions": null,
            "solverChecks": 1914,
            "dfsEntries": 22,
            "dfsChecks": 6,
            "ladderPasses": null,
            "phaseBSolves": null,
            "deepenProposals": null,
            "verificationSolves": 1,
            "canonicalRatings": 1
          },
          "entries": null
        }
      },
      {
        "id": "engine.native-ordinary-only",
        "group": "engine",
        "ok": true,
        "title": "ordinary-only on classic9: the native sample with its native caps, counted",
        "ms": 58,
        "detail": {
          "exact": false,
          "level": "easy",
          "score": 49,
          "counts": {
            "floorTests": null,
            "floorDeductions": null,
            "solverChecks": 28404,
            "dfsEntries": 1,
            "dfsChecks": 0,
            "ladderPasses": null,
            "phaseBSolves": null,
            "deepenProposals": null,
            "verificationSolves": 1,
            "canonicalRatings": 1
          },
          "entries": null
        }
      },
      {
        "id": "engine.budget-stops",
        "group": "engine",
        "ok": false,
        "title": "a tiny limit per dimension stops explicitly and restores the hooks",
        "ms": 5,
        "detail": {
          "error": "Error: the trial of FC did not decide: error {\"code\":null,\"message\":\"Cannot read properties of null (reading 'exact')\"} |     at trialOf (Q:\\git\\sudoku.improve-generating\\generator\\tests\\artifacts\\improve-generating\\phase0\\frontier-test.cjs:1090:13) |     at Q:\\git\\sudoku.improve-generating\\generator\\tests\\artifacts\\improve-generating\\phase0\\frontier-test.cjs:1290:17 |     at Array.forEach (<anonymous>)"
        }
      },
      {
        "id": "engine.suite",
        "group": "engine",
        "ok": false,
        "title": "the engine suite finished",
        "ms": 132,
        "detail": {
          "cases": 13
        }
      },
      {
        "id": "parity.patched-vs-plain",
        "group": "engine",
        "ok": true,
        "title": "hooks change no output (plain run versus patched run with a counting budget, every digest section)",
        "detail": {
          "differing": [],
          "plainDigest": "dc9fcf24adc958bfdd0d48018d7e4f37def335429eac23bccacaeae01780890b",
          "patchedDigest": "dc9fcf24adc958bfdd0d48018d7e4f37def335429eac23bccacaeae01780890b",
          "request": {
            "variantId": "classic9",
            "difficulty": "hard",
            "seed": 9002,
            "trace": "off"
          }
        }
      }
    ]
  },
  "reprojection": {
    "written": false,
    "reason": "the shard still has unstarted keys: emitted by the command that finishes it"
  },
  "catalogueProbe": {
    "wallMs": 103.91639999999995,
    "cpuMs": 109,
    "note": "unmeasured: loads the engine once per command so no trial carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": [
      "IG-S04/s1-large-controls/mega16:nightmare:11/proposal-only",
      "IG-S04/s1-large-controls/mega16:nightmare:11/ordinary-only",
      "IG-S04/s1-large-controls/mega16:nightmare:11/F1",
      "IG-S04/s1-large-controls/samurai:nightmare:11/proposal-only",
      "IG-S04/s1-large-controls/samurai:nightmare:11/ordinary-only",
      "IG-S04/s1-large-controls/samurai:nightmare:11/F1"
    ]
  }
}
```
