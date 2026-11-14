# IG-S01 / self-test (provisional-r1, a2)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: not applicable: IG-S01 is infrastructure only and confirms no speed estimate.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 36 | 36 | 0 | 0 | 0 | true |

Exclusions: synthetic cases, not timing observations

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

## Task details

```json
{
  "cases": [
    {
      "id": "source-list-corruption",
      "group": "pure",
      "ok": true,
      "ms": 0.8,
      "detail": {
        "realSources": 63
      }
    },
    {
      "id": "source-path-escape-and-missing",
      "group": "pure",
      "ok": true,
      "ms": 1.1,
      "detail": null
    },
    {
      "id": "duplicate-key-and-output",
      "group": "pure",
      "ok": true,
      "ms": 9.1,
      "detail": null
    },
    {
      "id": "incompatible-hashes",
      "group": "pure",
      "ok": true,
      "ms": 0.2,
      "detail": null
    },
    {
      "id": "missing-and-unstarted-row",
      "group": "pure",
      "ok": true,
      "ms": 0.7,
      "detail": null
    },
    {
      "id": "started-timeout-children-not-resumable",
      "group": "pure",
      "ok": true,
      "ms": 0.2,
      "detail": null
    },
    {
      "id": "immutable-attempt-output",
      "group": "pure",
      "ok": true,
      "ms": 39.6,
      "detail": null
    },
    {
      "id": "productive-pause-exit0-incomplete",
      "group": "pure",
      "ok": true,
      "ms": 1.2,
      "detail": null
    },
    {
      "id": "zero-or-quantised-cpu-never-infinite",
      "group": "pure",
      "ok": true,
      "ms": 2.1,
      "detail": null
    },
    {
      "id": "cold-ready-separation",
      "group": "pure",
      "ok": true,
      "ms": 0.2,
      "detail": null
    },
    {
      "id": "logical-block-packing-and-deadline",
      "group": "pure",
      "ok": true,
      "ms": 1.6,
      "detail": null
    },
    {
      "id": "one-sided-lower-bound-edges",
      "group": "pure",
      "ok": true,
      "ms": 1.3,
      "detail": null
    },
    {
      "id": "cluster-resampling-keeps-pairs",
      "group": "pure",
      "ok": true,
      "ms": 6.7,
      "detail": null
    },
    {
      "id": "transform-validation",
      "group": "pure",
      "ok": true,
      "ms": 36.2,
      "detail": {
        "transformHash": "807e0597ca8f11168bd6e682f2b8b472b982abee6658213a6d5d02fb3d48d9e2",
        "afterTextHash": "bbb337187828942258a5a805ed8aa4770b6d52dd3c3349e1c2bf47210ff3e379"
      }
    },
    {
      "id": "source-change-detected",
      "group": "pure",
      "ok": true,
      "ms": 1.2,
      "detail": null
    },
    {
      "id": "gate-states",
      "group": "pure",
      "ok": true,
      "ms": 0.5,
      "detail": null
    },
    {
      "id": "receipts-validated-before-frozen-generation",
      "group": "pure",
      "ok": true,
      "ms": 86.4,
      "detail": null
    },
    {
      "id": "lock-owner-must-be-proved",
      "group": "pure",
      "ok": true,
      "ms": 1.2,
      "detail": null
    },
    {
      "id": "rates-charge-all-spent-work",
      "group": "pure",
      "ok": true,
      "ms": 1.4,
      "detail": null
    },
    {
      "id": "host-deadline-late-decision-and-termination",
      "group": "pure",
      "ok": true,
      "ms": 72.3,
      "detail": null
    },
    {
      "id": "parity-defers-and-resume-chain-reconciles",
      "group": "pure",
      "ok": true,
      "ms": 15.2,
      "detail": null
    },
    {
      "id": "dispatcher-uses-only-the-wrapper",
      "group": "pure",
      "ok": true,
      "ms": 1.3,
      "detail": null
    },
    {
      "id": "test-only-cannot-leak",
      "group": "pure",
      "ok": true,
      "ms": 0.8,
      "detail": null
    },
    {
      "id": "harness-text-format",
      "group": "pure",
      "ok": true,
      "ms": 6.3,
      "detail": null
    },
    {
      "id": "descriptive-statistics",
      "group": "pure",
      "ok": true,
      "ms": 0.1,
      "detail": null
    },
    {
      "id": "firewall-detects-changes",
      "group": "pure",
      "ok": true,
      "ms": 2.4,
      "detail": null
    },
    {
      "id": "normalised-digest-includes-structure",
      "group": "pure",
      "ok": true,
      "ms": 1.1,
      "detail": null
    },
    {
      "id": "record-schema-unknown-is-null",
      "group": "pure",
      "ok": true,
      "ms": 0.4,
      "detail": null
    },
    {
      "id": "ledger-charges-and-shard-status",
      "group": "pure",
      "ok": true,
      "ms": 14.1,
      "detail": null
    },
    {
      "id": "plan-only-loads-no-engine",
      "group": "pure",
      "ok": true,
      "ms": 46.2,
      "detail": null
    },
    {
      "id": "busy-worker-request-timeout",
      "group": "worker",
      "ok": true,
      "ms": 310.2,
      "detail": {
        "coldWallMs": 306.99469999999997,
        "cpuToDecisionMs": 297,
        "cpuTotalMs": 312,
        "cleanupMs": 2.816000000000031,
        "quantumMs": 16,
        "tickMs": 101.18079999999998
      }
    },
    {
      "id": "busy-worker-command-timeout",
      "group": "worker",
      "ok": true,
      "ms": 457.6,
      "detail": {
        "coldWallMs": 455.8799999999999
      }
    },
    {
      "id": "real-worker-cold-ready-intervals",
      "group": "worker",
      "ok": true,
      "ms": 82,
      "detail": {
        "readyWallMs": 61.003600000000006,
        "startupMs": 19.307900000000018,
        "cleanupMs": 1.5240000000001146
      }
    },
    {
      "id": "worker-fails-closed",
      "group": "worker",
      "ok": true,
      "ms": 140.4,
      "detail": null
    },
    {
      "id": "engine-loads-and-discovers-catalogue",
      "group": "worker",
      "ok": true,
      "ms": 185.9,
      "detail": {
        "nativeLoadMs": 73.1917,
        "noopLoadMs": 68.6252,
        "catalogueFingerprint": "d035b740ff3ad78310773050a53f0633ca6ac4e4b38e68df173c19befef9fb3e",
        "ratingVersion": 2,
        "levels": [
          "veryEasy",
          "easy",
          "normal",
          "hard",
          "expert",
          "master",
          "nightmare",
          "hell1",
          "hell2"
        ],
        "variants": 15,
        "techniques": 26,
        "defaults": {
          "pipelineDefaultMaxAttempts": 8,
          "pipelineSteps": [
            "configure",
            "buildModel",
            "fullGrid",
            "extraStructure",
            "dig",
            "rate",
            "tune"
          ],
          "fullTraceMaxCells": 300,
          "smallBoardCells": 81,
          "capRatings": 1024,
          "shallowSearchRatings": 256,
          "digOrders": [
            "random",
            "rowByRow",
            "snake",
            "spiral",
            "jumpOne"
          ],
          "symmetryKinds": [
            "none",
            "rotational180",
            "rotational90",
            "mirrorH",
            "mirrorV",
            "mirrorBoth",
            "diagonal",
            "antiDiagonal"
          ]
        }
      }
    },
    {
      "id": "verifier-audits-a-handmade-puzzle",
      "group": "worker",
      "ok": true,
      "ms": 456.6,
      "detail": {
        "goodWallMs": 91.12079999999969,
        "goodCpuMs": 125,
        "cpuStatus": "resolved"
      }
    }
  ],
  "cpuProbe": {
    "api": "process.cpuUsage (user+system of the host process, worker threads included; read once at the host)",
    "probeWallMs": 90.47570000000002,
    "changesSeen": 7,
    "incrementsMs": [
      15,
      16,
      16,
      31,
      16,
      15
    ],
    "minIncrementMs": 15,
    "quantumMs": 16
  }
}
```
