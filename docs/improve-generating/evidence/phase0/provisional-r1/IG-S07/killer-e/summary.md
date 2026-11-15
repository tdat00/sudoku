# IG-S07 / killer-e (provisional-r1, a1)

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
| killer:expert:1 | 10734.569 | 10829.779 | 12000 | 11761.513 | 11889.062 | 13078 | 1.090 | 1.096 | 1.098 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 10734.569 | 10734.569 | 10734.569 | 10734.569 |
| cold wall ms | 1 | 10829.779 | 10829.779 | 10829.779 | 10829.779 |
| cpu total ms | 1 | 12000 | 12000 | 12000 | 12000 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 12000 ms, resolved); per cold wall second 0 (all spent wall 10838.099 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 12000 | 10838.099 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 12000 | 10838.099 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 11761.513 | 11761.513 | 11761.513 | 11761.513 |
| cold wall ms | 1 | 11889.062 | 11889.062 | 11889.062 | 11889.062 |
| cpu total ms | 1 | 13078 | 13078 | 13078 | 13078 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 13078 ms, resolved); per cold wall second 0 (all spent wall 11896.989 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 13078 | 11896.989 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 13078 | 11896.989 |

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
        "pairId": "IG-S07/killer-e/killer:expert:1/profiled",
        "comparator": "same-command unprofiled arm",
        "comparatorKey": "IG-S07/killer-e/killer:expert:1/unprofiled",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "d8d8479e42082b17bbc749b6705b7cbbade739440d6f3f94dec87864f98cbc16",
        "comparatorPuzzleHash": "d8d8479e42082b17bbc749b6705b7cbbade739440d6f3f94dec87864f98cbc16",
        "profiledDigest": "49405971f37f5cc93430407a621898ea104d32d4fc4b5ac1819a2c0334bb2864",
        "comparatorDigest": "49405971f37f5cc93430407a621898ea104d32d4fc4b5ac1819a2c0334bb2864"
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
      "key": "IG-S07/killer-e/killer:expert:1/profiled",
      "outcome": "complete",
      "rootMs": 11754.414,
      "workerRunMs": 11754.373,
      "readyWallMs": 11761.5133,
      "contextShare": {
        "setup": 0,
        "attempt": 0.552,
        "ordinary": 0.344,
        "local": 0.103
      },
      "finderShareOfRoot": 0.568,
      "finderCalls": 3614270,
      "solves": 21075,
      "canonicalRates": 1881,
      "samples": 104,
      "problems": []
    }
  ],
  "calibration": {
    "wallMs": 326.6071999999999,
    "cpuMs": 376,
    "iterations": 100000,
    "repeats": 5,
    "clockReadNs": 61.1,
    "finderTimerPairNs": 164.3,
    "applyTimerNs": 149.3,
    "framePairNs": 167.1,
    "countedCheckNs": 0,
    "counterIncrementNs": 0,
    "sink": true
  },
  "referenceCompatibility": [],
  "engineChecks": null,
  "catalogueProbe": {
    "wallMs": 104.75329999999997,
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
      "IG-S07/killer-e/killer:expert:1/unprofiled",
      "IG-S07/killer-e/killer:expert:1/profiled"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
