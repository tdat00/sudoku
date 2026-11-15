# IG-S08 - Bounded SM3 attribution of Jigsaw seed1111

| Header | Value |
|---|---|
| Depends on | IG-S07 accepted |
| Developer | claude-sonnet-5.5 |
| Size /active time | Small-medium;30-60 min |
| Machine allocation | 6 min, two admission periods included |
| Owner /milestone | Tail diagnosis only |
| Authority | IG-S-Q07; SM3 remains phase0;300 s wrapper ceiling |
| Status | Not started |

## Goal and scope

Attribute the historical325.313 s Jigsaw Expert request without running an illegal400 s command.
An interrupted but well-attributed240 s observation is useful evidence. This task does not promise to
remeasure the uncensored total or implement S7.

In H: `jigsaw-profile.cjs`, private stage/heartbeat hooks and evidence.
Out: any new production/local search ceiling, altered restart choice, seed substitution, optimisation,
main-tree access or a raised wrapper limit.

## Fixed diagnostic

- Native `jigsaw9`, Expert, seed1111, trace off, rotational180/random/default options and attempts.
- Profile the unmodified algorithm with source-only observations. Publish stage entry/exit to the responsive
  host before entering synchronous work. Include buildModel/layout construction, grid, extraStructure,
  oracles, safety count, rating and local continuation.
- Add count-based progress for layout attempts/growth backtracks, grid restarts and DFS/check counts where
  the private source exposes them. Do not add a different budget to the algorithm to make it finish.
- Observation guard240 s, command270 s, supplied wrapper300 s. The host journals the current stage and
  latest counters, terminates the worker and records a **censored lower bound** if the request has not ended.
- A long function without progress callbacks still has its durable stage-start marker. Missing fine-grained
  counters are unknown, not zero; attribute only at the granularity actually observed.

Do not checkpoint/rewrite DFS merely to squeeze the whole325 s request across lock turns. If complete
within-stage attribution genuinely requires more work, return the bounded evidence and ask Astra/the
orchestrator for a separately designed experiment.

## Commands, samples and projection

Two shards:

1. `control`: Jigsaw Expert seed1100, one native and one profiled request; synthetic short-timeout journal
   recovery test. Same default configuration. No other seed search.
2. `tail`: Jigsaw Expert seed1111, one profiled request up to240 s.

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S08 -Round provisional-r1
```

Projection: approximately4 min tail observation, at most30 s control/cleanup and1.5 min grace =6 min.
Frozen rerun, same seeds and bound (a tail that disappears is also a result):

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S08 -Round frozen-gate -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

## Acceptance criteria - Business

| ID | Criterion |
|---|---|
| B01 | The historical tail is attributed to an observed stage, or lack of attribution is explicit |
| B02 | Censoring is not a pass, a completed latency, or evidence that a specific S7 ceiling is safe |
| B03 | Difficulty-v3 priority and300 s command ceiling are preserved |

## Acceptance criteria - Technical

| ID | Criterion |
|---|---|
| T01 | A stage-start/progress journal survives busy-worker termination |
| T02 | Control output matches native; no production restart/guard/RNG changes |
| T03 | On completion, independent validation runs; on timeout, no invented puzzle/check result |
| T04 | Wall/CPU/counter lower bounds, source identity and missing data are explicit |

## Test plan and record formats

Synthetic timer/journal recovery plus the three fixed real observations. No unguarded rerun of1111.
Write `stage-journal.jsonl`, reconciled `records.json`, `tail-attribution.json`, `summary.json/md`.
Summary distinguishes historical325.313 s, this run's completed/censored duration, stage lower bounds,
instrumentation overhead on1100, and what remains unknown.

## Definition of done and handoff

A correctly recorded240 s timeout can complete this **diagnostic task**, not a latency gate.
The orchestrator records the future S7 design question; the developer changes no ceiling.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (pack author: IG-S08 ACCEPT after one reporting-only fix round; provisional SM3 diagnostic, not a latency gate) |
| Start /end | 2026-11-15 08:07:58-08:50 (+07:00) first pass; 08:55 author review (accept with fixes F1-F3); 09:00-09:12 fix round r3 (reporting only); 09:15 author acceptance; orchestrator commit |
| Developer /model | claude-sonnet-5.5; 153 model calls, 62,647,594 input tokens (61,371,813 cache reads), 340,362 output tokens, about 1,273 AI credits. Author review gpt-6-astra; orchestrator claude-opus-5.5 |
| Files /source identities | New under `phase0/`: `jigsaw-profile.cjs`, `adapters/jigsaw-profile.cjs` (32 in-memory transforms), `plans/ig-s08.cjs`, `ig08-worker.cjs`, `ig08-run.cjs`, `ig08-aggregate.cjs`, `ig08-test.cjs` (32/32); `run.cjs` (task glue, `attemptDir` passed to `prepare`/`execute`), one dispatch line in `worker.cjs`; README. Fingerprints: runtime `36b2b832…`, harness base `5027a528f03a`, commands `fe2bae1efce6`, r2 writer `acd724186e2d`, r3 writer `82b623923934` |
| Verification /evidence | `docs/improve-generating/evidence/phase0/provisional-r1/IG-S08/` (`summary-r3.md` current; r1 and r2 kept; `tail-attribution-r3.json`; `control/`, `tail/` journals and records). Jigsaw seed 1111 **censored at 240.015 s** (guard 240 s, command deadline 265 s), CPU at least 238.55 s, no puzzle; historical 325.313 s not remeasured. Cumulative full-grid contexts 238.78 s (99.5 %), local continuation 0.77 s, dig 0.27 s, buildModel 0.04 s (layout accepted first), rate 0.01 s. Open stage (fullGrid attempt 4) at least 238.46 s, inside the unlimited last search entered 0.27 s after the stage opened (after restart 50), running at least 238.18 s; the 3 finished full-grid stages took 0.32 s. Completed searches 138 (111 full-grid + 27 buildModel), unchanged from heartbeat 1 to the end; the running search is in none of the counts; live DFS counters 84,717,442 nodes and 176,221,059 backtracks; per-attempt counts unknown, not reconstructed. Counters advanced at all 47 heartbeats (not a stall). Control seed 1100 observed matches native, ready-wall factor 1.16 (n = 1). 28/28 engine checks, 15/15 synthetic journal-recovery checks. The author reran the pure tests and reproduced r2 and r3 read-only, with journal-hash and record reconciliation |
| Machine charged /priority wait | 336.39 s of 360 s (control 4.98 s + 45 s grace; tail 241.42 s + 45 s grace), no approvals; priority waits 45.21 s and 45.13 s (quiet period only, no contention), not charged |
| Findings /author answers | The tail points at the full-grid search (Q07 option (b): versioned total-work/restart limits, outcome unknown), not at buildJigsaw, the safety count, rating or local search; consistent with, not proof of, the historical 325 s being the same stage. The instrumented observation ran past the 120 s application guard, which does not establish uninstrumented latency; no ceiling sized from one censored request; no ceiling changed. Author findings: F1 counter scope (cumulative vs open stage, completed vs active searches), F2 solver-check totals were not instrumented (internal `OBJECTIVE_STEPS` and uniqueness-count guards exist and are unchanged), F3 unconditional application/native-speed claims removed; all closed in r3. Disclosed deviations: the control command also ran the instrument's engine checks and a calibration; pure tests, a source-only transform dry run, `-PlanOnly` and the aggregator ran unwrapped (no engine/worker thread); records, `command.json` notes and r1/r2 keep the earlier wording (listed in r3) |
| Orchestrator review /acceptance | Only harness and evidence folders changed; formats checked |
| Handoff | IG-S09 proceeds with the existing populations, arms and 15-minute allocation; brief additions: explicit internal-guard accounting, full-grid/setup time separated from sign-pass/local effects, and "unwrapped native" controls mean observer-free but still inside the priority wrapper. Explicitly pre-MS07 |
