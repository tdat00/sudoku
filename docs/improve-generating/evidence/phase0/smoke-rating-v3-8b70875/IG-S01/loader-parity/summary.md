# IG-S01 / loader-parity (smoke-rating-v3-8b70875, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **paused-unstarted** (exit 0). Estimate verdict: not applicable: IG-S01 is infrastructure only and confirms no speed estimate.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 4 | 1 | 0 | 0 | 3 | false |

Exclusions: correctness controls, not timing observations

## Sources

| item | value |
|---|---|
| runtime label (supplied) | rating-v3@8b70875e1839d7f2753d20853a4a0c9226cf2035 |
| runtime fingerprint | bad5fb5040b7666a3a226158e82dcd62a81afe5e93bd16613adce8d6db98a3c1 |
| runtime files | 63 |
| harness fingerprint | c961af25bc432e02854fda27db1508498ec72647bd00a02c0ba3a1c0727cc171 |
| adapters | noop-expose |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Paired rows (before = reference, after = prototype)

| pair | ref ready ms | ref cold ms | ref cpu ms | proto ready ms | proto cold ms | proto cpu ms | cpu factor | ready factor | cold factor |
|---|---|---|---|---|---|---|---|---|---|
| classic4:veryEasy:1 | 7.920 | 109.063 | 188 | n/a | n/a | n/a | n/a | n/a | n/a |
| classic9:hard:1 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |

## Arm: reference

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 1 | 7.920 | 7.920 | 7.920 | 7.920 |
| cold wall ms | 1 | 109.063 | 109.063 | 109.063 | 109.063 |
| cpu total ms | 1 | 188 | 188 | 188 | 188 |

Requests 2, complete 1, censored 0, errors 0, validation unknown 0, unstarted 1. Verified hits 1; per CPU second 5.319 (all spent CPU 188 ms, resolved); per cold wall second 8.943 (all spent wall 111.824 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 1 | 188 | 111.824 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 1 | 188 | 111.824 |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 0 | n/a | n/a | n/a | n/a |
| cold wall ms | 0 | n/a | n/a | n/a | n/a |
| cpu total ms | 0 | n/a | n/a | n/a | n/a |

Requests 2, complete 0, censored 0, errors 0, validation unknown 0, unstarted 2. Verified hits 0; per CPU second n/a (all spent CPU 0 ms, unresolved); per cold wall second n/a (all spent wall 0 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 0 | 0 | 0 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 0 | 0 | 0 |

## Task details

```json
{
  "loaderParity": {
    "pairs": [
      {
        "pairId": "classic4:veryEasy:1",
        "verdict": "deferred",
        "waitingFor": "prototype",
        "arm": "reference"
      },
      {
        "pairId": "classic9:hard:1",
        "verdict": "not-started"
      }
    ],
    "failed": 0,
    "ok": 0,
    "deferred": 2,
    "complete": false
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S01/loader-parity/classic4:veryEasy:1/native"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": [
      "IG-S01/loader-parity/classic4:veryEasy:1/noop-expose",
      "IG-S01/loader-parity/classic9:hard:1/noop-expose",
      "IG-S01/loader-parity/classic9:hard:1/native"
    ]
  }
}
```
