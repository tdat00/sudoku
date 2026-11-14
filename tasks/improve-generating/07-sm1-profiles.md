# IG-S07 - SM1 stage and finder profiles

| Header | Value |
|---|---|
| Depends on | IG-S06 accepted |
| Developer | claude-sonnet-5.5 |
| Size /active time | Medium-large;60-90 min |
| Machine allocation | 12 min, nine admission periods included |
| Owner /milestone | Attribution, after the early paired headline work |
| Authority | Report section6; IG-S-Q05/Q06; owner ordering |
| Status | Not started |

## Goal and scope

Explain the observed gains/misses without confusing canonical ratings with all logical solves or a capped
request group with time spent in local search. This tests the report's sample/local shares, per-kind
asymmetry, and the unmeasured finder share behind S3.

In H: `profile.cjs`, read-only/private observation hooks, reporting tests and evidence.
Out: optimisation, a new policy/cap, production changes, a full corpus run and treating instrumented
profile latency as the headline before/after figure.

## Fixed measurements

Keep trace off and the native generation algorithm. Instrument semantic boundaries without enabling
the application's full trace. Measure:

- model/full grid/extra structure; sample versus local continuation; sample kind and ordinal;
- StageA oracle, StageB objective, proposal DFS/below-chain solve, safety count, keeper count,
  canonical rating, refinement and local work, with nested calls attributed rather than double-counted;
- each finder: calls, hits, inclusive/exclusive wall time, budget checks and scoped-prototype coverage;
- raw DFS entries, DFS checks/backtracks, full-grid restarts;
- actual guided candidates per round, accepted/refused/skipped groups and refusal reason;
- per attempt: ratings/proposals, firstShallowAt, cap reason and first exact origin;
- for frontier records already gathered: floor/refusal/DFS/deepen/verification fractions and S2 audit.

Per-finder time uses cheap wall timers; do not call process CPU accounting millions of times.
Request-level host CPU remains the common process-wide measurement. Keep unattributed work visible
instead of calling every logical solve a canonical rating. A missing important stage hook is an author
question, not a guessed attribution.

## Exact population and commands

| Shard | Cell /level | Literal seed | Unprofiled comparator |
|---|---|---:|---|
| m16 | mega16 Nightmare | 3 | matched IG-S02 native |
| m12 | mega12 Nightmare | 3 | matched IG-S02 native |
| sam | samurai Nightmare | 42 | matched IG-S02 native, trace off |
| c9 | classic9 Nightmare | 3 | matched IG-S02 native |
| killer-n | killer Nightmare | 3 | matched IG-S02 native |
| gt-n | greaterThan Nightmare | 3 | matched IG-S02 native |
| killer-h | killer Hard | 1 | one new unprofiled arm in this shard |
| killer-e | killer Expert | 1 | one new unprofiled arm in this shard |
| gt-normal | greaterThan Normal | 300 | one new unprofiled arm in this shard |

Nine profiled requests and three additional unprofiled controls. For existing baselines, enforce active
reference compatibility; do not compare a changed harness silently. Historical G13 summary tracing is
not the comparator for this trace-off request.

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S07 -Round provisional-r1
```

Budget basis: roughly4 min native/profile work,6.75 min grace,1.25 min margin. Keep the180 s request and
270 s command safeguards; record instrumentation overhead and censoring.

Frozen rerun, same cells/seeds:

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S07 -Round frozen-gate -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

## Steps

1. Add profile-only hooks to the private loader; benchmark/reference modes stay unchanged.
2. Test nested accounting and exception/finally handling with synthetic stages.
3. Execute the nine fixed shards; preserve puzzle/hash/flags versus the unprofiled comparator.
4. Compute stage/finder fractions, actual oracle-call counts and profile-overhead ratios.
5. Link these to IG-S03's implemented scopes and IG-S05's floor-cost ledger; do not extrapolate a
   partial-S3 result to all chains or every unimplemented finder.

## Acceptance criteria - Business

| ID | Criterion |
|---|---|
| B01 | The report identifies measured costs, not the loose1296-solve upper-count model |
| B02 | Local-search request-group time is kept separate from actual local-stage time |
| B03 | Existing headline measurements remain the timing evidence; profiles are attribution evidence |

## Acceptance criteria - Technical

| ID | Criterion |
|---|---|
| T01 | Stage totals reconcile with a visible residual; inclusive and exclusive finder times are not summed twice |
| T02 | Canonical ratings, oracle solves and DFS checks have distinct counters |
| T03 | Completed profiled outputs match native outputs; errors restore every observation hook |
| T04 | Count guards are untouched; instrumentation adds no hidden solve or random draw |
| T05 | Source/case/trace/overhead metadata accompanies every profile |

## Test plan and records

Synthetic nesting/throw tests and the twelve fixed requests only. No sample probability is inferred by
dividing a few totals by the native attempts. Report sample/local hit origins from actual observations.

Write common records plus `stage-profile.json`, `finder-profile.json`, `overhead.json`,
`summary.json/md`. Markdown gives each headline cell's measured sample/local/other shares, proposal/
ordinary cost, top finder costs, scope coverage and whether the report's assumed bottleneck holds.
Counts/time below resolution are reported honestly, not rounded into a claimed speed-up.

## Definition of done and handoff

Handoff to SM3/Q16: stage identities, hot or unbounded operations, count meanings and overhead.
No task rewrites earlier timing rows with profiled numbers.

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
