# IG-S07 / c9 (provisional-r1, a1)

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
| classic9:nightmare:3 | n/a | n/a | n/a | 5797.932 | 5916.319 | 6547 | n/a | n/a | n/a |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 5797.932 | 5797.932 | 5797.932 | 5797.932 |
| cold wall ms | 1 | 5916.319 | 5916.319 | 5916.319 | 5916.319 |
| cpu total ms | 1 | 6547 | 6547 | 6547 | 6547 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 6547 ms, resolved); per cold wall second 0 (all spent wall 5921.212 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 6547 | 5921.212 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 6547 | 5921.212 |

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
        "pairId": "IG-S07/c9/classic9:nightmare:3/profiled",
        "comparator": "IG-S02 native-w1 (harness generation dd759a22)",
        "comparatorKey": "IG-S02/c9/classic9:nightmare:3/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "bf9e4ae7ba99b8f7312c31d43c85a282c966f691730fe75d5c0f25d665f4fb93",
        "comparatorPuzzleHash": "bf9e4ae7ba99b8f7312c31d43c85a282c966f691730fe75d5c0f25d665f4fb93",
        "profiledDigest": "48a2dddbebec707b86a85a349352e08efd710f836c0d6a95aa0444b8f9ab9d49",
        "comparatorDigest": "48a2dddbebec707b86a85a349352e08efd710f836c0d6a95aa0444b8f9ab9d49"
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
      "key": "IG-S07/c9/classic9:nightmare:3/profiled",
      "outcome": "complete",
      "rootMs": 5791.445,
      "workerRunMs": 5791.403600000001,
      "readyWallMs": 5797.9317,
      "contextShare": {
        "setup": 0,
        "attempt": 0.001,
        "ordinary": 0.569,
        "proposal": 0.033,
        "local": 0.396
      },
      "finderShareOfRoot": 0.695,
      "finderCalls": 434359,
      "solves": 6364,
      "canonicalRates": 1143,
      "samples": 104,
      "problems": []
    }
  ],
  "calibration": {
    "wallMs": 309.2799,
    "cpuMs": 343,
    "iterations": 100000,
    "repeats": 5,
    "clockReadNs": 59.4,
    "finderTimerPairNs": 160.8,
    "applyTimerNs": 148.8,
    "framePairNs": 166.5,
    "countedCheckNs": 0,
    "counterIncrementNs": 0,
    "sink": true
  },
  "referenceCompatibility": [
    {
      "key": "IG-S07/c9/classic9:nightmare:3/profiled",
      "baselineKey": "IG-S02/c9/classic9:nightmare:3/native-w1",
      "recordsFile": "docs/improve-generating/evidence/phase0/provisional-r1/IG-S02/c9/a3/records.json",
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
  "engineChecks": {
    "passed": 13,
    "total": 13,
    "results": [
      {
        "id": "engine.transforms-loaded",
        "ok": true
      },
      {
        "id": "engine.profile-parity.classic4-veryEasy-1",
        "ok": true
      },
      {
        "id": "engine.profile-consistency.classic4-veryEasy-1",
        "ok": true
      },
      {
        "id": "engine.profile-error-unwinding.classic4-veryEasy-1",
        "ok": true
      },
      {
        "id": "engine.profile-abandon.classic4-veryEasy-1",
        "ok": true
      },
      {
        "id": "engine.profile-parity.classic9-hard-1",
        "ok": true
      },
      {
        "id": "engine.profile-consistency.classic9-hard-1",
        "ok": true
      },
      {
        "id": "engine.profile-error-unwinding.classic9-hard-1",
        "ok": true
      },
      {
        "id": "engine.profile-abandon.classic9-hard-1",
        "ok": true
      },
      {
        "id": "engine.profile-parity.classic9-nightmare-2",
        "ok": true
      },
      {
        "id": "engine.profile-consistency.classic9-nightmare-2",
        "ok": true
      },
      {
        "id": "engine.profile-error-unwinding.classic9-nightmare-2",
        "ok": true
      },
      {
        "id": "engine.profile-abandon.classic9-nightmare-2",
        "ok": true
      }
    ]
  },
  "catalogueProbe": {
    "wallMs": 105.16420000000005,
    "cpuMs": 78,
    "note": "unmeasured: loads the engine once per command so no request carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S07/c9/classic9:nightmare:3/profiled"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
