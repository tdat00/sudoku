# IG-S07 / sam (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: attribution only; the headline timings stay IG-S02's (profiles are not timing evidence).

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 1 | 1 | 0 | 0 | 0 | true |

Exclusions: an instrumented run is not a timing run: the profiled wall time is never a before/after figure; the unmeasured catalogue probe, the calibration and the independent audit are outside every generation time; the three controls' unprofiled arms are overhead comparators, not new headline measurements

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | 0feb1ea57bd481a17889f3e678143ce55574691748f44cae486be1e51c307225 |
| adapters | profile |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Paired rows (before = reference, after = prototype)

| pair | ref ready ms | ref cold ms | ref cpu ms | proto ready ms | proto cold ms | proto cpu ms | cpu factor | ready factor | cold factor |
|---|---|---|---|---|---|---|---|---|---|
| samurai:nightmare:42 | n/a | n/a | n/a | 22425.106 | 22557.603 | 23203 | n/a | n/a | n/a |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 22425.106 | 22425.106 | 22425.106 | 22425.106 |
| cold wall ms | 1 | 22557.603 | 22557.603 | 22557.603 | 22557.603 |
| cpu total ms | 1 | 23203 | 23203 | 23203 | 23203 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 23203 ms, resolved); per cold wall second 0 (all spent wall 22562.790 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 23203 | 22562.790 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 23203 | 22562.790 |

## Task details

```json
{
  "arms": {
    "prototype": "profiled native request (adapter profile, runtime installed for the one pipeline call)",
    "reference": "unprofiled native request (the unchanged host path), controls only"
  },
  "identity": {
    "pairs": [
      {
        "pairId": "IG-S07/sam/samurai:nightmare:42/profiled",
        "comparator": "IG-S02 native-w1 (harness generation dd759a22)",
        "comparatorKey": "IG-S02/sam/samurai:nightmare:42/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "a79c68ee57d91e728c84a001b5de18b4d95db170f2b3461c92afad9c909bb587",
        "comparatorPuzzleHash": "a79c68ee57d91e728c84a001b5de18b4d95db170f2b3461c92afad9c909bb587",
        "profiledDigest": "95955fe0e5d55620af7fe78d7227be736d2e0662eee3006ea1b331e112920821",
        "comparatorDigest": "95955fe0e5d55620af7fe78d7227be736d2e0662eee3006ea1b331e112920821"
      }
    ],
    "failed": 0,
    "ok": 1,
    "notComparable": 0,
    "deferred": 0,
    "complete": true
  },
  "profiles": [
    {
      "key": "IG-S07/sam/samurai:nightmare:42/profiled",
      "outcome": "complete",
      "rootMs": 22417.787,
      "workerRunMs": 22417.744700000003,
      "readyWallMs": 22425.1055,
      "contextShare": {
        "setup": 0,
        "attempt": 0.001,
        "ordinary": 0.583,
        "proposal": 0.145,
        "local": 0.272
      },
      "finderShareOfRoot": 0.894,
      "finderCalls": 1955903,
      "solves": 6695,
      "canonicalRates": 565,
      "samples": 26,
      "problems": []
    }
  ],
  "calibration": {
    "wallMs": 323.20449999999994,
    "cpuMs": 375,
    "iterations": 100000,
    "repeats": 5,
    "clockReadNs": 59.9,
    "finderTimerPairNs": 165.9,
    "applyTimerNs": 150.6,
    "framePairNs": 170.5,
    "countedCheckNs": 0,
    "counterIncrementNs": 0,
    "sink": true
  },
  "referenceCompatibility": [
    {
      "key": "IG-S07/sam/samurai:nightmare:42/profiled",
      "baselineKey": "IG-S02/sam/samurai:nightmare:42/native-w1",
      "recordsFile": "docs/improve-generating/evidence/phase0/provisional-r1/IG-S02/sam/records.json",
      "ok": true,
      "problems": [],
      "baselineRuntimeFingerprint": "36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a",
      "baselineCatalogueFingerprint": "d035b740ff3ad78310773050a53f0633ca6ac4e4b38e68df173c19befef9fb3e",
      "baselineHarnessFingerprint": "dd759a22bf13b732face5b950b3e3054cf12e79115f0f5eed536e74f306406fd",
      "harnessFilesAtEvidence": 16,
      "changedFiles": [
        "aggregate.cjs",
        "ig02-run.cjs",
        "run.cjs",
        "worker.cjs"
      ],
      "removedFiles": [],
      "accountingFilesChanged": []
    }
  ],
  "engineChecks": null,
  "catalogueProbe": {
    "wallMs": 106.12380000000007,
    "cpuMs": 126,
    "note": "unmeasured: loads the engine once per command so no request carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S07/sam/samurai:nightmare:42/profiled"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
