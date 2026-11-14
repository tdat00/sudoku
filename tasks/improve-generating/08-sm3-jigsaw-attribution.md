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
| Status | |
| Start /end | |
| Developer /model | |
| Files /source identities | |
| Verification /evidence | |
| Machine charged /priority wait | |
| Findings /author answers | |
| Orchestrator review /acceptance | |
| Handoff | |
