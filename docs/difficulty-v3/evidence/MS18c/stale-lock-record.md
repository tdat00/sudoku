# MS18c Stage 3: record of the one stale real lock (pre-GQ, developer's own stand-in)

Status: disclosure record for SA1's review (accepted by SA1 as a one-time pre-GQ deviation).

| Item | Value |
|---|---|
| File | `%TEMP%\dv3-sudoku.lock` (the real lock) |
| Content when found | `18240\|standin-supervisor-loss-20261118175306-18240\|2026-11-18T17:53:06.623Z` |
| Owner | the developer's own `supervisor-loss` stand-in (run id `standin-supervisor-loss-20261118175306-18240`) |
| Why it was left | the `supervisor-loss` scenario kills its stand-in supervisor on purpose; a killed supervisor cannot release its lock |
| Proof that PID 18240 was dead | checked before the removal: the PID was no longer running (reported in the earlier Stage 3 report) |
| Other work at that time | no Node process was running except the Discord poller; no other timed work in the session |
| Foreign lock | none involved: the content named the developer's own run |
| Action | the developer removed the file after those checks, once |
| Rule from now on | only the orchestrator clears a real lock; no stand-in uses it (the stand-ins of `standin-s3b\` have a private lock only, and each scenario records that no private lock is left behind) |

The Stage 3 stand-in proofs of this pass (`standin-s3b\`) never touched `%TEMP%\dv3-sudoku.lock`: its absence was
checked before and after the proof run.
