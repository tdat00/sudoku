# IG-S07 / killer-h (provisional-r1, a1)

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
| killer:hard:1 | 5421.787 | 5510.969 | 6266 | 6196.001 | 6313.819 | 6922 | 1.105 | 1.143 | 1.146 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 5421.787 | 5421.787 | 5421.787 | 5421.787 |
| cold wall ms | 1 | 5510.969 | 5510.969 | 5510.969 | 5510.969 |
| cpu total ms | 1 | 6266 | 6266 | 6266 | 6266 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 6266 ms, resolved); per cold wall second 0 (all spent wall 5514.792 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 6266 | 5514.792 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 6266 | 5514.792 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 6196.001 | 6196.001 | 6196.001 | 6196.001 |
| cold wall ms | 1 | 6313.819 | 6313.819 | 6313.819 | 6313.819 |
| cpu total ms | 1 | 6922 | 6922 | 6922 | 6922 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 0; per CPU second 0 (all spent CPU 6922 ms, resolved); per cold wall second 0 (all spent wall 6318.350 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 6922 | 6318.350 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 6922 | 6318.350 |

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
        "pairId": "IG-S07/killer-h/killer:hard:1/profiled",
        "comparator": "same-command unprofiled arm",
        "comparatorKey": "IG-S07/killer-h/killer:hard:1/unprofiled",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "b2e55e58466204683d7435a6f7be868153a7abad72c809a8fd78bf4bc7ff2f07",
        "comparatorPuzzleHash": "b2e55e58466204683d7435a6f7be868153a7abad72c809a8fd78bf4bc7ff2f07",
        "profiledDigest": "4ad1523767e6b97e818e7be85e691d29b4752575e2c8dd4b8276bae1a7b24ead",
        "comparatorDigest": "4ad1523767e6b97e818e7be85e691d29b4752575e2c8dd4b8276bae1a7b24ead"
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
      "key": "IG-S07/killer-h/killer:hard:1/profiled",
      "outcome": "complete",
      "rootMs": 6189.891,
      "workerRunMs": 6189.849499999999,
      "readyWallMs": 6196.000899999999,
      "contextShare": {
        "setup": 0,
        "attempt": 0.302,
        "ordinary": 0.505,
        "local": 0.192
      },
      "finderShareOfRoot": 0.344,
      "finderCalls": 2899161,
      "solves": 20358,
      "canonicalRates": 515,
      "samples": 104,
      "problems": []
    }
  ],
  "calibration": {
    "wallMs": 320.3999,
    "cpuMs": 344,
    "iterations": 100000,
    "repeats": 5,
    "clockReadNs": 74.3,
    "finderTimerPairNs": 165.5,
    "applyTimerNs": 153.9,
    "framePairNs": 168.3,
    "countedCheckNs": 0,
    "counterIncrementNs": 0,
    "sink": true
  },
  "referenceCompatibility": [],
  "engineChecks": null,
  "catalogueProbe": {
    "wallMs": 101.99659999999994,
    "cpuMs": 94,
    "note": "unmeasured: loads the engine once per command so no request carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S07/killer-h/killer:hard:1/unprofiled",
      "IG-S07/killer-h/killer:hard:1/profiled"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
