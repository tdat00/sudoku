# IG-S01 - Isolated harness, manifests and durable records

| Header | Value |
|---|---|
| Depends on | Owner's provisional prototype instruction |
| Developer | claude-sonnet-5.5 |
| Size /active time | Medium-large;60-120 min |
| Machine allocation | 4 min, admission grace included |
| Owner /milestone | Test-side tooling; M0 |
| Authority | Check-list; IG-S-Q05/Q06; owner pre-freeze exception |
| Status | Not started |

## Goal and business context

Make subsequent numbers auditable, isolated and cheap to rerun. A prototype must not accidentally mutate
the production engine, reuse the old540 s driver, run git for metadata, or call a timed-out request a hit.
This task creates infrastructure only; it confirms no speed estimate.

## Scope and repository rules

In: the common harness H and evidence for this task, as defined in the check-list.
Out: production, existing tests, goldens, docs of difficulty-v3, application integration and any broad suite.
Read `AGENTS.md` and the check-list. Developer questions go to Astra; no git or task/log edits.
Do not execute the old MS05e driver: it contains `gitState()` and old wrapper/ceiling assumptions.

## Inputs and files

Read only:

- `generator\tests\node-runner.js` (`SOURCE_FILES` declaration).
- `generator\tests\artifacts\difficulty-v3\MS05e\measure-gt.js` for record/loader ideas, not execution.
- `generator\js\engine\pipeline.js`, `digger.js`, `core\js\engine\logical-solver.js`.
- The supplied `ig-lock.ps1`, unchanged.

Create under H:
`Invoke-IgTask.ps1`, `run.cjs`, `host.cjs`, `worker.cjs`, `loader.cjs`, `manifest.cjs`,
`records.cjs`, `self-test.cjs`, and a concise `README.md` for invocation/record schemas.
A small shared module is allowed under H; no dependency installation.

## Fixed design

1. Implement the check-list's isolated loader, input fingerprints and production firewall.
   The native path loads unmodified bytes in a private VM inside a worker. Do not execute the test runner.
2. Provide validated private-source transforms with unique function anchors and before/after hashes.
   No-op exposure hooks must preserve native outputs. Never write a transformed source over its origin.
3. Use a responsive host with worker threads. Read process-wide CPU once at the host; all worker CPU is
   included already. Record decision, cleanup and total CPU independently of validation.
   Record the engine-ready boundary, startup CPU and grid-build CPU separately. SM2 uses the ready
   interval; requests retain cold-inclusive metrics. Aggregate tiny CPU intervals rather than invent
   precision; optional per-thread attribution cannot replace or be added to host totals.
4. Implement a command guard270 s, supervised request guard180 s and sample guard45 s.
   An interrupted worker sends no fake result. The host records timeout and its actual CPU, terminates
   owned workers and writes a final observation before the wrapper's300 s backstop.
5. Implement immutable row keys, start/finish journal, atomic JSON, source-stability check and reconciliation.
   Prevent accidental overwrite/duplicate acceptance. Unknown fields/counters use null, not zero.
6. `Invoke-IgTask.ps1` must source the prescribed wrapper and invoke it for each shard. It owns a budget
   ledger, not lock files. `-PlanOnly` loads no engine. `-ResumeUnstarted` cannot retry a started row.
   Support `-LockHelper` with the owner-supplied path beneath `$env:USERPROFILE` as default. Derive the
   repository from the script's location, not a hard-coded worktree; all per-task commands run from its root.
   A productive budget pause returns0 plus explicit `paused-unstarted` JSON; error/unsupported exits stop.
   Bound each host deadline by remaining task/round time as well as270 s, with grace/cleanup reserved.
7. Materialise the exact populations/shards in the task files. A manifest records order and expected keys
   before generation. Reference/prototype order alternates by seed-list index, not by outcomes.
   Separate immutable logical jobs from physical packing. Pack consecutive complete jobs up to admission
   limits, split only never-started jobs, preserve priority/order and fingerprint the physical plan too.
8. Add common independent validation and normalised result digests. Prototype and verifier use separate
   engine instances. Include variant structure in the hash; do not hash only givens.
9. Add the common JSON/markdown emitter and analysis helpers (percentiles, paired-cluster resampling,
   binomial-tail inversion). Tests use synthetic records; numerical tests include0 hits and all hits.
10. Implement frozen receipt/budget checks. A frozen flag alone must not enable formal gates.
    No later frozen execution is authorised by this task's4-minute allocation.

## Exact commands and population

The only real generation here is no-op-loader parity on:
`classic4/veryEasy/seed1`, `classic9/hard/seed1`, native defaults, trace off, one result per loader.
These are correctness controls, not timing observations.

```powershell
$helper = Join-Path $env:USERPROFILE '.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
. $helper
Invoke-IgNode -Repo sudoku -Task 'IG-S01/self-test' -NodeArgs @(
  'generator\tests\artifacts\improve-generating\phase0\self-test.cjs',
  '--task=IG-S01', '--round=provisional-r1'
)
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S01 -Round provisional-r1
```

The first command is synthetic-only; the dispatcher then runs shard `loader-parity` with the two fixed
controls. Do not make the dispatcher rerun the synthetic shard already recorded. Planned two invocations.

Frozen rerun, after approval, is one command:

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S01 -Round frozen-gate -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

## Acceptance criteria - Business

| ID | Criterion |
|---|---|
| B01 | Nothing outside the authorised harness/evidence paths is modified |
| B02 | Every current output is visibly provisional (pre-freeze), never an offer/gate pass |
| B03 | Developers/orchestrator can identify exactly what was measured and resume unstarted work without rerunning successes |

## Acceptance criteria - Technical

| ID | Criterion |
|---|---|
| T01 | Missing/escaping source, ambiguous transform, source change and duplicate output fail closed |
| T02 | Native/no-op parity passes for both fixed puzzles, including canonical rating/exactness/structure |
| T03 | Synthetic busy-worker termination preserves a timeout record and CPU accounting; no process-wide double counting |
| T04 | Dispatcher uses only the supplied low-priority wrapper and enforces task/round budgets |
| T05 | Frozen receipt, unsupported-source and provisional gate states are tested |

## Test plan and records

Synthetic cases: source-list corruption; path escape; duplicate key; incompatible hashes; missing/unstarted
row; started-timeout and its abandoned child samples cannot be resumed; immutable-attempt output;
productive pause is exit0 but incomplete; zero/quantised CPU cannot create infinity; cold/ready separation;
logical-block packing and shrinking remaining deadline; one-sided lower bound at0/n and n/n;
cluster resampling keeps pairs together; a busy synthetic worker is terminated by a short **test-only**
host timer; speculative CPU/cleanup is not dropped. Never spend180 s to test a timeout.

Write `command.json`, `records.json`, `source-manifest.json`, `firewall-before.json`,
`firewall-after.json`, `summary.json` and `summary.md` under the task's evidence directory.
The short synthetic timer cannot leak into generation manifests.

## Definition of done and handoff

Orchestrator receives the exact created-file list, fingerprints, test results, planned future shard keys
and charged machine time. H must be made persistent by the orchestrator at M0; the developer performs
no staging/commit. Subsequent tasks extend this harness rather than create independent timing drivers.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (pack author: IG-S01 ACCEPT after one fix round) |
| Start /end | 2026-11-14 20:35-21:17 (+07:00) first pass; 21:31-21:51 fix round; 21:55 author acceptance; orchestrator commit |
| Developer /model | claude-sonnet-5.5; 137 model calls, 56,690,835 input tokens (55,505,132 cache reads), 481,975 output tokens, about 1,333 AI credits. Author review gpt-6-astra; orchestrator claude-opus-5.5 |
| Files /source identities | `generator/tests/artifacts/improve-generating/phase0/` (`Invoke-IgTask.ps1`, `run.cjs`, `host.cjs`, `worker.cjs`, `loader.cjs`, `manifest.cjs`, `records.cjs`, `self-test.cjs`, `common.cjs`, `README.md`); accepted harness fingerprint `64b1e386…`; runtime `36b2b832…b50a` (the worktree's source, equal to `f7be90f`); catalogue `d035b740…fb3e` (rating version 2, 15 variants, 26 techniques). No tracked file changed |
| Verification /evidence | `docs/improve-generating/evidence/phase0/provisional-r1/IG-S01/`: self-test 31/31 (a1), then 36/36 (a2) through `Invoke-IgNode`; loader parity on `classic4/veryEasy/1` and `classic9/hard/1`: native and no-op-loader digests equal in every section, claimed exact equals verified exact; busy-worker kill at 458 ms with CPU not double counted; real wrapped pause and resume: a2 `paused-unstarted` (classic4 pair only), a3 `-ResumeUnstarted` to `complete` (classic9 pair only), `chain.noRerun` true, both pairs `parity-ok` |
| Machine charged /priority wait | 237.0 s of the 240 s allocation (six wrapped commands, each with 45 s grace); priority waits behind difficulty-v3 about 63, 45, 66, 59 and 129 s, not charged |
| Findings /author answers | Author's acceptance review: four fixes (lock owner must be proved; rate denominators charge all spent work with censored/error/unknown listed apart; deadlines from process start, late decisions dropped, termination timeout stops without forgetting the worker; deferred parity reconciled over the resume chain with a real pause/resume) and `runtimeFingerprint` in `ig-s-budget/1` with both receipts validated before frozen generation; all applied. Receipt names `ig-s-freeze/1` and `ig-s-budget/1` approved. Accepted as disclosed: full `SOURCE_FILES` loading in each worker, docs firewall by size and mtime, no optional per-thread CPU attribution |
| Orchestrator review /acceptance | Worktree status shows only the new harness and evidence folders; no production, test, golden or difficulty-v3 file changed; formats checked (CRLF, no BOM) |
| Handoff | IG-S02 dispatched as written: reuse the accepted foundation `64b1e386…` and its guards, accounting and resume logic; charge further work to IG-S02's allocation; no further IG-S01 runs |
