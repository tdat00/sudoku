# IG-S01 / loader-parity (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: not applicable: IG-S01 is infrastructure only and confirms no speed estimate.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 4 | 4 | 0 | 0 | 0 | true |

Exclusions: correctness controls, not timing observations

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | 9c2facb6fd74275f048b56b3135d0e5411b5bb2ae36a328f1994a2f824aa23ea |
| adapters | noop-expose |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Paired rows (before = reference, after = prototype)

| pair | ref ready ms | ref cold ms | ref cpu ms | proto ready ms | proto cold ms | proto cpu ms | cpu factor | ready factor | cold factor |
|---|---|---|---|---|---|---|---|---|---|
| classic4:veryEasy:1 | 7.650 | 111.982 | 188 | 7.802 | 99.094 | 94 | 0.500 | 1.020 | 0.885 |
| classic9:hard:1 | 64.754 | 150.481 | 251 | 64.876 | 155.318 | 297 | 1.183 | 1.002 | 1.032 |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 2 | 7.650 | 64.754 | 64.754 | 64.754 |
| cold wall ms | 2 | 111.982 | 150.481 | 150.481 | 150.481 |
| cpu total ms | 2 | 188 | 251 | 251 | 251 |

Requests 2, complete 2, censored 0, errors 0, unstarted 0. Verified hits 2; per CPU second 4.556 (aggregate CPU 439 ms, resolved); per cold wall second 7.470. With few requests p95 is the observed maximum.

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 2 | 7.802 | 64.876 | 64.876 | 64.876 |
| cold wall ms | 2 | 99.094 | 155.318 | 155.318 | 155.318 |
| cpu total ms | 2 | 94 | 297 | 297 | 297 |

Requests 2, complete 2, censored 0, errors 0, unstarted 0. Verified hits 2; per CPU second 5.115 (aggregate CPU 391 ms, resolved); per cold wall second 7.736. With few requests p95 is the observed maximum.

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
    "ok": 2
  }
}
```
