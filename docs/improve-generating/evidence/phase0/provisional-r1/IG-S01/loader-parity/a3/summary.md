# IG-S01 / loader-parity (provisional-r1, a3)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: not applicable: IG-S01 is infrastructure only and confirms no speed estimate.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 2 | 2 | 0 | 0 | 0 | true |

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
| classic9:hard:1 | 62.157 | 147.408 | 234 | 62.755 | 162.488 | 296 | 1.265 | 1.010 | 1.102 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 62.157 | 62.157 | 62.157 | 62.157 |
| cold wall ms | 1 | 147.408 | 147.408 | 147.408 | 147.408 |
| cpu total ms | 1 | 234 | 234 | 234 | 234 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 1; per CPU second 4.274 (all spent CPU 234 ms, resolved); per cold wall second 6.685 (all spent wall 149.590 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 234 | 149.590 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 234 | 149.590 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 62.755 | 62.755 | 62.755 | 62.755 |
| cold wall ms | 1 | 162.488 | 162.488 | 162.488 | 162.488 |
| cpu total ms | 1 | 296 | 296 | 296 | 296 |

Requests 1, complete 1, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 1; per CPU second 3.378 (all spent CPU 296 ms, resolved); per cold wall second 6.026 (all spent wall 165.937 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 296 | 165.937 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 296 | 165.937 |

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
        "verdict": "parity-ok",
        "problems": [],
        "digestsEqual": true,
        "differing": [],
        "referenceDigest": "a375f65cad8529c9885ffc8d9196b9e42c4039289ae9e66defc35d5814c06aae",
        "prototypeDigest": "a375f65cad8529c9885ffc8d9196b9e42c4039289ae9e66defc35d5814c06aae",
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
        "puzzleHash": "378e2e6823ed40bdd318eb4c66c1eb53589082e8a8eeef6470216ed23ae91af4"
      }
    ],
    "failed": 0,
    "ok": 2,
    "deferred": 0,
    "complete": true
  },
  "chain": {
    "attempts": [
      "a2",
      "a3"
    ],
    "resumed": true,
    "startedBefore": [
      "IG-S01/loader-parity/classic4:veryEasy:1/native",
      "IG-S01/loader-parity/classic4:veryEasy:1/noop-expose"
    ],
    "startedHere": [
      "IG-S01/loader-parity/classic9:hard:1/noop-expose",
      "IG-S01/loader-parity/classic9:hard:1/native"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
