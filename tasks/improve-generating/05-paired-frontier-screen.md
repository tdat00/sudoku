# IG-S05 - Paired SM2 grid screen and yield rates

| Header | Value |
|---|---|
| Depends on | IG-S04 accepted; budget/variant manifest fixed |
| Developer | claude-sonnet-5.5 |
| Size /active time | Medium;45-75 min plus the bounded measurement |
| Machine allocation | 48 min maximum; logical blocks packed into bounded physical commands |
| Owner /milestone | SM2 evidence; M3 |
| Authority | IG-S-Q05 and Q08-Q10; provisional owner exception |
| Status | Not started |

## Goal and scope

Measure S1/S2's real cost/yield against both native sample kinds before a production rewrite.
This confirms/refutes the report's assumed sample-cost divisors and exposes the unknown exact-yield lever.
It is a controlled grid experiment, **not** a default request or final offer qualification.

In: H `sm2-screen.cjs`, fixed manifest expansion, rate/uncertainty summary; new evidence.
Out: algorithm changes, budget tuning, S3 during these trials, additional seeds, production allowlisting,
local-search removal from production, and treating zero baseline hits as a known zero population rate.
Questions go to Astra; no git or other runners.

## Fixed experiment

- Cells: classic9, mega12, mega16, samurai; Nightmare.
- Eight literal grid-seed clusters101-108 per cell, native model and `grid#1`.
- Modes: proposal-only, ordinary-only, F0, F1, FC, FM, FU, FS.
- Up to two native-fork samples (`dig#1.1`, `dig#1.2`) per mode/grid, stop on the first independently
  checkable exact sample (complete canonical rating and in-generation uniqueness proof).
  The independent post-timing verifier does not steer/resume generation: a failed check is a correctness
  stop, not permission to try a replacement sample. No local continuation in this experiment.
  Record skipped-first-exact ordinals.
- Use reference solver, width1; all frontier modes share the reviewed per-cell IG-S04 count budget.
  Native-kind controls retain their native guards/caps and the same45 s observation backstop.
- Thus at most32 grid clusters,256 grid-mode trials and512 sample observations.
  Each grid-mode trial can deliver at most one hit; still retain all sample-origin detail.
- Order rotates by preregistered cluster index. The engine seed/RNG forks never depend on that scheduling.
  Build the same deterministic grid afresh for each mode, require equal hashes within its cluster, and
  charge each mode's actual setup CPU/wall. Do not share a free prebuilt grid or count an imputed setup
  cost as measured CPU. Each trial uses a fresh host; its primary interval starts at engine-ready,
  before grid construction, and ends after trial cleanup. Record startup CPU/wall and cold-inclusive
  rates separately. The loader's repeated cold start is not part of the primary SM2 rate.

Primary rates are verified delivered grid hits divided by all ready-interval generation CPU/wall spent by that mode,
with grid setup and cleanup accounted. Also report raw exact sample rate, distinct hashes, time/counts per
sample and first-hit ordinal. Do not count two copies of one successful grid return as two delivered hits.
Record setup/sample/cleanup separately. A Derived setup-amortised sensitivity uses actual sample cost plus
grid-build cost divided by12 (or the native coarse sample count); it is not measured request throughput,
does not add observations and cannot replace the primary denominator.

## Shards and exact commands

For each of four cells and two seed blocks101-104 /105-108, retain these four **logical** blocks:

| Priority /suffix | Modes |
|---|---|
| 1 /primary | proposal-only, ordinary-only,F1 |
| 2 /floors | FC,FM |
| 3 /reference | FU,FS |
| 4 /s2-control | F0 |

This is32 logical blocks, **not32 mandatory lock acquisitions**. Complete the primary tier across all
four cells and both seed blocks before extensions. Within each tier visit seed block101-104 across the
four cells in listed order, then105-108; rotate arms within the block by cluster index.
The dispatcher packs consecutive grid-mode jobs into physical commands using pilot cost plus validation/
cleanup margin. A logical block may span commands; one command may contain several blocks. Never split
a started trial or change its sample count to make it fit. Unknown frontier costs use the45 s/sample
ceiling in admission. Keep logical row keys/order separate from the physical command plan/hash.
Leave unstarted keys rather than overrun270 s or48 min. F1 is the common comparator, not repeated per block.

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S05 -Round provisional-r1
```

Planning is conditional on IG-S04. At15-45 s/sample, mega16 F1 alone costs about4-12 min for eight two-sample
trials; samurai may cost the same. Their six frontier variants alone could cost24-72 min **per cell**.
The48 min allocation prioritises primary comparisons, not guaranteed completion of the full matrix.
Packing the short classic9/mega12 blocks can save roughly12-15 min of the old24-min grace estimate;
use any realised saving for frontier work within this task, never assume it was saved before measuring.
Unreached FC/FM/FU/FS/F0 rows are unstarted/inconclusive. Stop with the primary coverage obtained if needed.

Frozen rerun, after a separate budget approval, expands the same preregistered design to grid seeds101-140
(40 clusters per cell; the same maximum two samples/mode). It must recompute IG-S04 budgets on the frozen
pilot first. One command:

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S05 -Round frozen-gate -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

The expanded cost is not authorised by the first-round48 min allocation.

## Steps

1. Validate source/catalogue and the signed-off pilot budget/variant manifests; save planned keys before runs.
2. Run the predeclared priority manifest through the common low-priority dispatcher, packing/splitting
   physical commands without changing logical jobs, populations or trial counts.
3. Validate every returned candidate with the unpatched verifier. Unknown validation counts as no verified hit.
4. Aggregate paired seed clusters, including budget/timeout outcomes and all spent CPU.
5. Produce per-kind and per-variant rates with the check-list's paired cluster uncertainty; no pseudo-count.
6. Write a deterministic **per-cell diagnostic selection** for IG-S06:
   among variants with all planned grid trials observed (eight now,40 frozen, including failure/budget outcomes), paired
   control coverage and at least one verified grid hit, rank by verified grid hits/ready CPU second, then hits/ready wall
   second, then fixed order F1,FC,FM,FU,FS,F0. If every variant has zero hits, use F1 as an explicitly
   non-winning diagnostic default. Also use that labelled default if none has complete comparable coverage.
   Do not select by a lucky partial cohort; report missing coverage and selection uncertainty.
7. Mark every current feasibility result `not-evaluable-pre-freeze`. A selected variant is not an adopted
   algorithm or a successful formal gate. Request-level confirmation belongs to IG-S06.

## Acceptance criteria - Business

| ID | Criterion |
|---|---|
| B01 | The frontier's hit rate is reported per CPU and wall second against both native kinds |
| B02 | No fast zero-hit failure, duplicated hit or skipped slow record masquerades as availability |
| B03 | A reviewed diagnostic selection is frozen before the disjoint held-out request cohort |

## Acceptance criteria - Technical

| ID | Criterion |
|---|---|
| T01 | Every planned cluster/mode/sample ordinal is returned, censored, early-exact skipped or explicitly unstarted |
| T02 | All arms of a cluster use the same grid/model and named sample roots |
| T03 | Budget identity is constant across variants of a cell; no after-the-fact retuning |
| T04 | Paired resampling keeps whole grid clusters together and handles0 hits without pseudo-counts |
| T05 | Every numerator is independently verified; CPU/wall inclusion is the common contract |

## Test plan and record formats

Synthetic summary tests: zero hits in both controls; one positive cluster; duplicate sample hashes;
early-exact skips; timeout CPU retained; a missing mode cannot be dropped from paired analysis;
selection tie order; source/budget mismatch; an unverified claimed hit cannot enter the numerator.
Do not regenerate real puzzles to test these reporting cases.

Common records plus `screen-manifest.json`, `rates.json`, `paired-intervals.json`,
`selection.json`, `summary.json/md`. Markdown has separate columns for floor tests/refusals, DFS,
canonical solves, budget stops, exact/shallow/below/above outcomes, CPU and wall.
Per variant report the share ending sample-budget and, beside the primary all-work rate, a clearly
conditional rate excluding such trials. That secondary rate cannot select a winner or pass a gate.
Label the eight-cluster intervals descriptive; do not present them as reliable lower confidence guarantees.
Report how much of a supposedly “few-solves” sample is failed-floor/DFS work. Do not extrapolate a
per-sample rate directly into an unqualified90% request claim.

## Definition of done and handoff

The orchestrator reviews the raw paired coverage, not just the winning row. IG-S06 receives the unchanged
selection and budget hashes. If no candidate has hits or the screen cannot finish inside allocation, retain
that finding and ask the author/orchestrator; no automatic bank decision or larger run.

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
