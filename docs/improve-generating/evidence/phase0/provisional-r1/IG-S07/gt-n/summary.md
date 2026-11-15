# IG-S07 / gt-n (provisional-r1, a1)

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
| greaterThan:nightmare:3 | n/a | n/a | n/a | 12426.969 | 12553.665 | 16516 | n/a | n/a | n/a |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 12426.969 | 12426.969 | 12426.969 | 12426.969 |
| cold wall ms | 1 | 12553.665 | 12553.665 | 12553.665 | 12553.665 |
| cpu total ms | 1 | 16516 | 16516 | 16516 | 16516 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 1; per CPU second 0.061 (all spent CPU 16516 ms, resolved); per cold wall second 0.080 (all spent wall 12565.255 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 16516 | 12565.255 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 16516 | 12565.255 |

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
        "pairId": "IG-S07/gt-n/greaterThan:nightmare:3/profiled",
        "comparator": "IG-S02 native-w1 (harness generation dd759a22)",
        "comparatorKey": "IG-S02/gt/greaterThan:nightmare:3/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "cab90de52117228a5b8d93f65313701c5820a06b033ba596f32cbb19c2ecb46d",
        "comparatorPuzzleHash": "cab90de52117228a5b8d93f65313701c5820a06b033ba596f32cbb19c2ecb46d",
        "profiledDigest": "a75550bfe613914f81487b35f446a774b22899c6b09953870d5c25fe661b45e9",
        "comparatorDigest": "a75550bfe613914f81487b35f446a774b22899c6b09953870d5c25fe661b45e9"
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
      "key": "IG-S07/gt-n/greaterThan:nightmare:3/profiled",
      "outcome": "complete",
      "rootMs": 12420.873,
      "workerRunMs": 12420.8311,
      "readyWallMs": 12426.9692,
      "contextShare": {
        "setup": 0,
        "attempt": 0.001,
        "ordinary": 0.282,
        "proposal": 0.288,
        "local": 0.429
      },
      "finderShareOfRoot": 0.457,
      "finderCalls": 1295272,
      "solves": 3948,
      "canonicalRates": 117,
      "samples": 40,
      "problems": []
    }
  ],
  "calibration": {
    "wallMs": 309.9666000000001,
    "cpuMs": 313,
    "iterations": 100000,
    "repeats": 5,
    "clockReadNs": 59.7,
    "finderTimerPairNs": 161.5,
    "applyTimerNs": 149.1,
    "framePairNs": 167,
    "countedCheckNs": 0,
    "counterIncrementNs": 0,
    "sink": true
  },
  "referenceCompatibility": [
    {
      "key": "IG-S07/gt-n/greaterThan:nightmare:3/profiled",
      "baselineKey": "IG-S02/gt/greaterThan:nightmare:3/native-w1",
      "recordsFile": "docs/improve-generating/evidence/phase0/provisional-r1/IG-S02/gt/records.json",
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
    "wallMs": 101.75639999999999,
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
      "IG-S07/gt-n/greaterThan:nightmare:3/profiled"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
