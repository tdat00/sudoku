# IG-S07 / gt-normal (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: attribution only; the headline timings stay IG-S02's (profiles are not timing evidence).

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 2 | 2 | 0 | 0 | 0 | true |

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
| greaterThan:normal:300 | 2138.451 | 2230.428 | 3828 | 2185.767 | 2306.156 | 4062 | 1.061 | 1.022 | 1.034 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 2138.451 | 2138.451 | 2138.451 | 2138.451 |
| cold wall ms | 1 | 2230.428 | 2230.428 | 2230.428 | 2230.428 |
| cpu total ms | 1 | 3828 | 3828 | 3828 | 3828 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 1; per CPU second 0.261 (all spent CPU 3828 ms, resolved); per cold wall second 0.444 (all spent wall 2252.987 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 3828 | 2252.987 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 3828 | 2252.987 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 2185.767 | 2185.767 | 2185.767 | 2185.767 |
| cold wall ms | 1 | 2306.156 | 2306.156 | 2306.156 | 2306.156 |
| cpu total ms | 1 | 4062 | 4062 | 4062 | 4062 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 1; per CPU second 0.246 (all spent CPU 4062 ms, resolved); per cold wall second 0.431 (all spent wall 2320.719 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 4062 | 2320.719 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 4062 | 2320.719 |

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
        "pairId": "IG-S07/gt-normal/greaterThan:normal:300/profiled",
        "comparator": "same-command unprofiled arm",
        "comparatorKey": "IG-S07/gt-normal/greaterThan:normal:300/unprofiled",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "ec8e1f4c4cc71276ccdfba087208b380d504108e01083d8d4057780531d98505",
        "comparatorPuzzleHash": "ec8e1f4c4cc71276ccdfba087208b380d504108e01083d8d4057780531d98505",
        "profiledDigest": "d81f60366274456ff329e441eca8f7e53e0b77ff72d4ad674ad24da172798677",
        "comparatorDigest": "d81f60366274456ff329e441eca8f7e53e0b77ff72d4ad674ad24da172798677"
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
      "key": "IG-S07/gt-normal/greaterThan:normal:300/profiled",
      "outcome": "complete",
      "rootMs": 2180.656,
      "workerRunMs": 2180.6139,
      "readyWallMs": 2185.7674999999995,
      "contextShare": {
        "setup": 0.001,
        "attempt": 0.002,
        "ordinary": 0.275,
        "local": 0.721
      },
      "finderShareOfRoot": 0.11,
      "finderCalls": 263679,
      "solves": 1835,
      "canonicalRates": 19,
      "samples": 18,
      "problems": []
    }
  ],
  "calibration": {
    "wallMs": 313.6308999999999,
    "cpuMs": 313,
    "iterations": 100000,
    "repeats": 5,
    "clockReadNs": 59.6,
    "finderTimerPairNs": 162.8,
    "applyTimerNs": 151.4,
    "framePairNs": 167.8,
    "countedCheckNs": 0,
    "counterIncrementNs": 0,
    "sink": true
  },
  "referenceCompatibility": [],
  "engineChecks": null,
  "catalogueProbe": {
    "wallMs": 105.04499999999996,
    "cpuMs": 109,
    "note": "unmeasured: loads the engine once per command so no request carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S07/gt-normal/greaterThan:normal:300/unprofiled",
      "IG-S07/gt-normal/greaterThan:normal:300/profiled"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
