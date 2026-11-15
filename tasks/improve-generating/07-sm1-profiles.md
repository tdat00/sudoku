# IG-S07 - SM1 stage and finder profiles

| Header | Value |
|---|---|
| Depends on | IG-S05 reporting/accounting closure; accepted IG-S02/03 baselines; IG-S06 dependency waived (2026-11-15) |
| Developer | claude-sonnet-5.5 |
| Size /active time | Medium-large;60-90 min |
| Machine allocation | 12 min, nine admission periods included |
| Owner /milestone | Attribution, after the early paired headline work |
| Authority | Report section6; IG-S-Q05/Q06; author/orchestrator scheduling decision of 2026-11-15 |
| Status | Not started |

## Goal and scope

Explain the observed gains/misses without confusing canonical ratings with all logical solves or a capped
request group with time spent in local search. This tests the report's sample/local shares, per-kind
asymmetry, and the unmeasured finder share behind S3.

In H: `profile.cjs`, read-only/private observation hooks, reporting tests and evidence.
Out: optimisation, a new policy/cap, production changes, a full corpus run and treating instrumented
profile latency as the headline before/after figure.

## Dispatch clarification after IG-S05 (2026-11-15)

IG-S06 is deferred, not passed or refuted: the pre-MS07 screen has no winning frontier variant, and its
all-zero rates are not a frozen S1/S9 decision. This task does not need IG-S06 results. Finish IG-S05's
reporting/accounting closure before timing so those shared-harness edits cannot invalidate a profile.
The nine profiled native requests and three controls below, the12-minute allocation and all guards stay
unchanged. No additional generation cohort or frontier strategy is introduced.

- Use IG-S02's accepted native baselines, including the Killer audit overlay, and IG-S03's corrected
  partial-S3 report. Keep their source identities; check active reference compatibility before reuse.
- For each cell, report finder time by generation stage and sample kind. Separate nakedSingle,
  hiddenSingleBox, hiddenSingleLine and the six naked/hidden pair/triple/quad finders from all other
  registered finders (17 on this source); list their IDs and retain individual expensive-finder rows.
  Keep state/context work, applying Findings, budget/bookkeeping and unattributed time as measured
  buckets or an explicit residual. Do not assume the unimplemented families explain the lack of S3 gain.
- For frontier phase A, use the existing IG-S04/05 ledgers on classic9, mega12, mega16 and samurai:
  compare F1 with FC/FM, separating accepted/refused floor tests, uniqueness DFS, allowed-set/canonical
  work and deepen. Classic9's empty frontier, the larger boards' overshoot/shallow candidates and the
  budget-ended searches are different outcomes, not interchangeable failures.
- Existing frontier phase-A wall includes floor tests and their DFS checks; its per-purpose counts
  are not per-purpose or per-finder wall measurements. Show that limit explicitly. Native-request
  finder shares cannot be transplanted into frontier phase A, nor prove scoped-cache overhead.
  New frontier per-finder profiles would be separately authorised work, not extra runs hidden here.

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
   partial-S3 result to all chains or every unimplemented finder. Keep native stage-by-finder timing
   separate from the existing frontier phase-A wall/count evidence and its attribution gaps.

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
| Status | Accepted (pack author: IG-S07 ACCEPT after one fix round; provisional attribution, not complete solver-check accounting) |
| Start /end | 2026-11-15 06:11-07:20 (+07:00) first pass; 07:30 author review; 07:36-08:03 fix round r2 (one loop-check command); 08:08 author acceptance; orchestrator commit |
| Developer /model | claude-sonnet-5.5; 299 model calls, 105,420,238 input tokens (104,149,957 cache reads), 529,783 output tokens, about 1,889 AI credits. Author review gpt-6-astra; orchestrator claude-opus-5.5 |
| Files /source identities | New under `phase0/`: `profile-runtime.cjs`, `adapters/profile.cjs` (v2, 27 transforms), `ig07-worker.cjs`, `plans/ig-s07.cjs`, `ig07-run.cjs`, `ig07-aggregate.cjs`, `ig07-test.cjs` (31/31); one line each in `worker.cjs` and `run.cjs`; README. Fingerprints: profile cohort `0feb1ea57bd4`, r1 report `f91e6e527f67`, loop-check command `062742c330eb`, r2 writer `5027a528f03a` |
| Verification /evidence | `docs/improve-generating/evidence/phase0/provisional-r1/IG-S07/` (`summary-r2.md` current, r1 kept; `stage-profile-r2.json`, `finder-profile-r2.json`, `lc/`). 12 requests, 0 censored, 0 errors; 9/9 profiled outputs digest-identical to their unprofiled comparators; 13 engine checks. Loop check on the real engine (Escargot classic9): 13/13, unpatched / patched / profiled identical at every budget limit; observed loop plus finder checks equal the budget's count including the throwing check |
| Machine charged /priority wait | 710.6 s of 720 s (10 commands; the 12 s approval lifted admission only) plus the disclosed unwrapped 0.47 s / 0.41 s CPU pre-check; priority waits 1,185.4 s, not charged |
| Findings /author answers | Stage shares (sample / local): mega16 90.5 / 9.5 (the report's anchor holds), mega12 83.5 / 16.4, samurai 72.8 / 27.2, classic9 60.3 / 39.6; Killer and Greater-Than have large non-finder shares (Killer DFS 45 %, Greater-Than `local.search` own code 25 %). Chains: legacy `nishio` plus `forcingChain` about 81 % of the single mega16 profile and 77 % of mega12. Conditional zero-cost scenarios (not full-S3 ceilings): covered-finder negative calls removed 1.03-1.15x (measured partial S3 0.94-1.03x); remaining-finder negative calls 1.02-2.36x, only 1.02-1.30x without chains; covered-finder family time removed 1.04-1.18x. r1 check totals inexact (loop-check boundaries; chain propagation checks bypassing `ctx.check`, read from the source). Frontier phase A from existing data: F1 phase-A share 52-92 %. Disclosures: classic9 first as a plumbing check; unprofiled arm first in the control shards; IG-S04 pilot as a second frontier dataset; n = 1 per cell; a `$env:TEMP` slip and a renamed file; the pre-check puzzle replaced by Escargot |
| Orchestrator review /acceptance | Only harness and evidence folders changed; formats checked. The chain finding was added to the non-gating interim note for the plan author |
| Handoff | IG-S08 on harness `5027a528f03a`, with `062742c330eb` kept as loop-test provenance and the counter limitation carried forward; busy-worker journals, unknown counters and actual censoring limits preserved; explicitly pre-MS07. Frozen attribution must distinguish MS07b's new chain families (`forcingChainLong`, `nishioDeep`) |
