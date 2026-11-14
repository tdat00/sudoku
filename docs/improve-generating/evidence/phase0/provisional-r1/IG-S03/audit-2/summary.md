# IG-S03 / audit-2 (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: provisional; judged in the task summary against IG-S02's matched baselines.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 9 | 9 | 0 | 0 | 0 | true |

Exclusions: the baselines are IG-S02's records (not rerun here); audited wall time is not a speed measurement; the unmeasured catalogue probe and the independent audit are outside every generation time; a censored or unverified arm proves neither identity nor speed

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | baeb9ea2c1ae6477e2b9a83efc57d73975a204b450b95f7b80e76f1706a20944 |
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
        "pairId": "IG-S03/audit-2/samurai:nightmare:1/audit",
        "verdict": "identity-ok",
        "problems": []
      },
      {
        "pairId": "IG-S03/audit-2/samurai:nightmare:2/audit",
        "verdict": "identity-ok",
        "problems": []
      },
      {
        "pairId": "IG-S03/audit-2/samurai:nightmare:42/audit",
        "verdict": "identity-ok",
        "problems": []
      },
      {
        "pairId": "IG-S03/audit-2/mega12:nightmare:1/audit",
        "verdict": "identity-ok",
        "problems": []
      },
      {
        "pairId": "IG-S03/audit-2/mega12:nightmare:2/audit",
        "verdict": "identity-ok",
        "problems": []
      },
      {
        "pairId": "IG-S03/audit-2/mega12:nightmare:3/audit",
        "verdict": "identity-ok",
        "problems": []
      },
      {
        "pairId": "IG-S03/audit-2/mega16:nightmare:1/audit",
        "verdict": "identity-ok",
        "problems": []
      },
      {
        "pairId": "IG-S03/audit-2/mega16:nightmare:2/audit",
        "verdict": "identity-ok",
        "problems": []
      },
      {
        "pairId": "IG-S03/audit-2/mega16:nightmare:3/audit",
        "verdict": "identity-ok",
        "problems": []
      }
    ],
    "failed": 0,
    "ok": 9,
    "notComparable": 0,
    "deferred": 0,
    "complete": true
  },
  "scoped": [],
  "audits": [
    {
      "key": "IG-S03/audit-2/samurai:nightmare:1/audit",
      "kind": "puzzle",
      "verdict": "parity-ok",
      "problems": []
    },
    {
      "key": "IG-S03/audit-2/samurai:nightmare:2/audit",
      "kind": "puzzle",
      "verdict": "parity-ok",
      "problems": []
    },
    {
      "key": "IG-S03/audit-2/samurai:nightmare:42/audit",
      "kind": "puzzle",
      "verdict": "parity-ok",
      "problems": []
    },
    {
      "key": "IG-S03/audit-2/mega12:nightmare:1/audit",
      "kind": "puzzle",
      "verdict": "parity-ok",
      "problems": []
    },
    {
      "key": "IG-S03/audit-2/mega12:nightmare:2/audit",
      "kind": "puzzle",
      "verdict": "parity-ok",
      "problems": []
    },
    {
      "key": "IG-S03/audit-2/mega12:nightmare:3/audit",
      "kind": "puzzle",
      "verdict": "parity-ok",
      "problems": []
    },
    {
      "key": "IG-S03/audit-2/mega16:nightmare:1/audit",
      "kind": "puzzle",
      "verdict": "parity-ok",
      "problems": []
    },
    {
      "key": "IG-S03/audit-2/mega16:nightmare:2/audit",
      "kind": "puzzle",
      "verdict": "parity-ok",
      "problems": []
    },
    {
      "key": "IG-S03/audit-2/mega16:nightmare:3/audit",
      "kind": "puzzle",
      "verdict": "parity-ok",
      "problems": []
    }
  ],
  "catalogueProbe": {
    "wallMs": 102.4026,
    "cpuMs": 109,
    "note": "unmeasured: loads the engine once per command so no arm carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S03/audit-2/samurai:nightmare:1/audit",
      "IG-S03/audit-2/samurai:nightmare:2/audit",
      "IG-S03/audit-2/samurai:nightmare:42/audit",
      "IG-S03/audit-2/mega12:nightmare:1/audit",
      "IG-S03/audit-2/mega12:nightmare:2/audit",
      "IG-S03/audit-2/mega12:nightmare:3/audit",
      "IG-S03/audit-2/mega16:nightmare:1/audit",
      "IG-S03/audit-2/mega16:nightmare:2/audit",
      "IG-S03/audit-2/mega16:nightmare:3/audit"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
