# IG-S03 / audit-1 (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **parity-failed** (exit 1). Estimate verdict: provisional; judged in the task summary against IG-S02's matched baselines.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 10 | 0 | 3 | 0 | 7 | false |

Exclusions: the baselines are IG-S02's records (not rerun here); audited wall time is not a speed measurement; the unmeasured catalogue probe and the independent audit are outside every generation time; a censored or unverified arm proves neither identity nor speed

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | e4182bd7ee327baeed99c577038ba44238afdac649e37292622e42947b548270 |
| adapters | scoped-solver, scoped-audit |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Task details

```json
{
  "arms": {
    "prototype": "S3 prototype (scoped negative scans of singles and subsets) with the harness paths of IG-S02",
    "audit": "three engine instances: plain native, native with audit annotations, scoped with audit annotations"
  },
  "identity": {
    "pairs": [
      {
        "pairId": "IG-S03/audit-1/synthetic/audit",
        "verdict": "identity-failed",
        "problems": [
          "audit outcome request-timeout"
        ]
      },
      {
        "pairId": "IG-S03/audit-1/classic9:nightmare:1/audit",
        "verdict": "identity-failed",
        "problems": [
          "audit outcome request-timeout"
        ]
      },
      {
        "pairId": "IG-S03/audit-1/classic9:nightmare:2/audit",
        "verdict": "identity-failed",
        "problems": [
          "audit outcome request-timeout"
        ]
      }
    ],
    "failed": 3,
    "ok": 0,
    "notComparable": 0,
    "deferred": 0,
    "complete": false
  },
  "scoped": [],
  "audits": [],
  "catalogueProbe": {
    "wallMs": 105.44389999999999,
    "cpuMs": 110,
    "note": "unmeasured: loads the engine once per command so no arm carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S03/audit-1/synthetic/audit",
      "IG-S03/audit-1/classic9:nightmare:1/audit",
      "IG-S03/audit-1/classic9:nightmare:2/audit"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": [
      "IG-S03/audit-1/classic9:nightmare:3/audit",
      "IG-S03/audit-1/killer:nightmare:1/audit",
      "IG-S03/audit-1/killer:nightmare:2/audit",
      "IG-S03/audit-1/killer:nightmare:3/audit",
      "IG-S03/audit-1/greaterThan:nightmare:1/audit",
      "IG-S03/audit-1/greaterThan:nightmare:2/audit",
      "IG-S03/audit-1/greaterThan:nightmare:3/audit"
    ]
  }
}
```
