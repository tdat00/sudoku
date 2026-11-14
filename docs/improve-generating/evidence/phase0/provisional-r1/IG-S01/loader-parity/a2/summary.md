# IG-S01 / loader-parity (provisional-r1, a2)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **paused-unstarted** (exit 0). Estimate verdict: not applicable: IG-S01 is infrastructure only and confirms no speed estimate.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 4 | 2 | 0 | 0 | 2 | false |

Exclusions: correctness controls, not timing observations

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | 64b1e3869d7e0869090aa0f258c596b72782c107bfe63146f3eb3f1a16e6d3eb |
| adapters | noop-expose |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Paired rows (before = reference, after = prototype)

| pair | ref ready ms | ref cold ms | ref cpu ms | proto ready ms | proto cold ms | proto cpu ms | cpu factor | ready factor | cold factor |
|---|---|---|---|---|---|---|---|---|---|
| classic4:veryEasy:1 | 8.184 | 114.020 | 110 | 7.627 | 98.181 | 109 | 0.991 | 0.932 | 0.861 |
| classic9:hard:1 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 8.184 | 8.184 | 8.184 | 8.184 |
| cold wall ms | 1 | 114.020 | 114.020 | 114.020 | 114.020 |
| cpu total ms | 1 | 110 | 110 | 110 | 110 |

Requests 2, complete 1, censored 0, errors 0, validation unknown 0, unstarted 1. Verified hits 1; per CPU second 9.091 (all spent CPU 110 ms, resolved); per cold wall second 8.569 (all spent wall 116.696 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 110 | 116.696 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 110 | 116.696 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 7.627 | 7.627 | 7.627 | 7.627 |
| cold wall ms | 1 | 98.181 | 98.181 | 98.181 | 98.181 |
| cpu total ms | 1 | 109 | 109 | 109 | 109 |

Requests 2, complete 1, censored 0, errors 0, validation unknown 0, unstarted 1. Verified hits 1; per CPU second 9.174 (all spent CPU 109 ms, resolved); per cold wall second 10.029 (all spent wall 99.715 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 109 | 99.715 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 109 | 99.715 |

## Task details

```json
{
  "loaderParity": {
    "pairs": [
      {
        "pairId": "classic4:veryEasy:1",
        "verdict": "parity-ok",
        "problems": [],
        "digestsEqual": true,
        "differing": [],
        "referenceDigest": "15f0dd915a0b137f765dac3bdfe4eadef1801ef92076e6fdc6c58b24caaf631f",
        "prototypeDigest": "15f0dd915a0b137f765dac3bdfe4eadef1801ef92076e6fdc6c58b24caaf631f",
        "sections": [
          "structure",
          "givens",
          "solution",
          "rating",
          "config",
          "warnings",
          "log",
          "work",
          "scalars",
          "puzzle"
        ],
        "claimedExact": true,
        "verifiedExact": true,
        "puzzleHash": "357db3ddfa704c2a616d7c32359952ee3773f59393283ad93808e4856f6b153e"
      },
      {
        "pairId": "classic9:hard:1",
        "verdict": "not-started"
      }
    ],
    "failed": 0,
    "ok": 1,
    "deferred": 1,
    "complete": false
  },
  "chain": {
    "attempts": [
      "a2"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S01/loader-parity/classic4:veryEasy:1/native",
      "IG-S01/loader-parity/classic4:veryEasy:1/noop-expose"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": [
      "IG-S01/loader-parity/classic9:hard:1/noop-expose",
      "IG-S01/loader-parity/classic9:hard:1/native"
    ]
  }
}
```
