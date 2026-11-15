# Improve generating - Sudoku phase-0 prototype pack

**Author:** Astra (gpt-6-astra). **Developers:** claude-sonnet-5.5, serial dispatch.
**Status:** pack review; no task is implemented or accepted merely because its file exists.
**Worktree:** `Q:\git\sudoku.improve-generating`, branch `improve-generating`.
**Supplied source label:** `1c042ad`; runtime is the `f7be90f` runtime, unchanged by `ef8a9cc`.
No author/developer git action is permitted. The orchestrator reviews, fills Execution logs, commits and pushes
at milestones. Only the orchestrator changes Done marks or execution records.

## 1. Authority and scope

Read `docs\improve-generating\clarifications.md`, all sixteen answers and "Direction after the joint report",
and the superseding header of `plan.md`. The owner's 2026-11-14 instruction authorises prototype verification
**now**, before difficulty-v3 freezes. This is a timing-of-research exception, not permission to change
production or use pre-freeze observations as the frozen gate.

Every current record and summary must say **provisional (pre-freeze)**. Formal IG-S-Q05 decisions remain
pending a rerun on the catalogue frozen after MS07 and MS17b/MS18e. Even an excellent current result does
not enable a cell, select a production allowance, change a default, or authorise the bank route.

Allowed implementation:

- New scripts, private source adapters, patched in-memory copies, tests and scratch data only in
  `generator\tests\artifacts\improve-generating\phase0\`.
- New immutable evidence under `docs\improve-generating\evidence\phase0\<round>\<task>\<shard>\`.
- Task documents in this folder are author-owned; developers ask Astra instead of changing them.

Not allowed: changes anywhere in `generator\js`, `core\js`, `player\js`, application script lists, guides,
runtime versions, history/cache/wire formats, qualification lists, existing tests/fixtures/goldens/hashes,
the MS05e scripts/evidence, or the main worktrees. No S4, S6, S7, S8, S9 or S10 production implementation.
No ordinary quick/full/manual/soak/perf/qualify run, hash updater or fixture recorder is part of this pack.
The targeted tests are the new harness's own tests and the explicitly enumerated generation experiments.

The main-tree difficulty-v3 task files were read only as a formatting reference. They do not give this
pack permission to use their execution wrappers or to consume their timing slots.

## 2. Serial task index and machine budget

Machine projections below include the command's occupied wall time, expected validation/self-test work,
and **45 seconds of quiet-admission overhead per planned wrapper invocation**. Additional waiting for
difficulty-v3 is excluded. They are planning allocations, not performance assertions. Development time
is separate. No silent retries or new seed searches may spend the reserve.

| Done | ID | File | Title | Depends on | Active development estimate | Machine allocation | Estimate/report rows addressed |
|---|---|---|---|---|---|---:|---|
| [x] | IG-S01 | [01](01-harness-and-records.md) | Isolated loader, manifests, safety and records | owner instruction | 60-120 min | 4 min | Common trustworthy baseline and CPU/wall accounting |
| [x] | IG-S02 | [02](02-headline-baseline-and-attempt-pool.md) | Paired headline baseline and S5a width4 | IG-S01 accepted | 90-150 min | 25 min | Six Nightmare rows; S5a and the two-attempt local limit |
| [x] | IG-S03 | [03](03-scoped-solver-and-check-parity.md) | Small S3 prototype with virtual-check parity | IG-S02 accepted | 2-3 h | 22 min | S3 multiplier; S3+S5a headline requests |
| [x] | IG-S04 | [04](04-frontier-prototype-and-budget-pilot.md) | S1/S2 variants and staged budget pilot | IG-S03 accepted | 2-4 h | 12 min | Measure large-board cost before admitting the rest |
| [x] | IG-S05 | [05](05-paired-frontier-screen.md) | Prioritised paired SM2 screen and yield rates | IG-S04 accepted | 45-75 min | 48 min | Native kinds/F1 first; extensions only within allocation |
| [ ] | IG-S06 | [06](06-composed-request-confirmation.md) | DEFERRED this pre-freeze round: held-out requests and sample lanes | Reschedule after frozen SM2 review | 90-150 min | 24 min (deferred) | Full-request composition remains unmeasured, not passed or refuted |
| [x] | IG-S07 | [07](07-sm1-profiles.md) | SM1 stage/finder profiles and overhead | IG-S05 reporting/accounting closure; IG-S02/03 baselines; IG-S06 waived | 60-90 min | 12 min | Sample/local/finder shares behind the time factors |
| [x] | IG-S08 | [08](08-sm3-jigsaw-attribution.md) | Bounded SM3 Jigsaw tail attribution | IG-S07 accepted | 30-60 min | 6 min | Jigsaw Expert seed1111, not a guessed tail fix |
| [x] | IG-S09 | [09](09-greater-than-diagnostic.md) | Greater-Than miss split and solve-first diagnostic | IG-S08 accepted | 60-90 min | 15 min | Q16; S-AV01; sign-pass and local-work assumptions |
| [x] | IG-S10 | [10](10-reconcile-and-freeze-handoff.md) | Results reconciliation and frozen-rerun handoff | IG-S09 accepted | 30-60 min | 4 min | Every estimate versus its measured scope; provisional gate report |
| | Reserve | author/orchestrator approval only | Splitting unstarted work or investigated failures | explicit approval | | 8 min | Never an automatic rerun allowance |
| | **Total** | | | | | **180 min** | **172 planned +8 reserve** |

Milestones: M0=IG-S01; M1=IG-S02 (first paired headlines); M2=IG-S03; M3=IG-S05;
M4=IG-S06 (deferred this round); M5=IG-S10. The orchestrator commits/pushes accepted work at these boundaries.
No parallel developers or independent generation commands in this worktree.

### Scheduling decision, 2026-11-15

IG-S06 is **deferred for the pre-freeze round**, not passed or refuted. IG-S05 found no verified exact
hit in any mode, including the native controls, on its eight grid clusters per cell. F1 is a non-winning
diagnostic default, not a selected strategy to compose. These pre-MS07 observations cannot decide
IG-S-Q05 or the S9 route; the catalogue, floors and search may change when difficulty-v3 freezes.

The author and orchestrator waive IG-S07's dependency on IG-S06. Close IG-S05's reporting/accounting
items before further timed work, then proceed IG-S07 -> IG-S08 -> IG-S09 -> IG-S10. IG-S07 retains its
fixed cells/seeds and12-minute allocation: native stage-by-finder profiles, the nine partial-S3 finders
versus the remaining registered finders, and analysis of the existing IG-S04/05 frontier phase-A ledgers.
Its brief distinguishes measured phase-A wall/counts from unmeasured frontier per-finder wall time.

This decision supersedes IG-S06's execution order in its task file for this round. Its24 minutes are not
an automatic transfer or a spending target; the180-minute round ceiling and difficulty-v3 priority stay.
IG-S10 must record composition as deferred/unmeasured, preserve the non-winning selection, and propose
when to implement and run IG-S06 after the frozen SM2 review and separate budget approval.

Negative performance, zero hits, a censored request or an unsupported projection are valid research outcomes,
not reasons to change the population. Invalid puzzles, false exact flags, an identity violation, corrupt
records, a production write or a changed design choice stop the task and go to Astra/the orchestrator.

## 3. Mandatory machine-priority protocol

Every possibly >10 s command uses exactly the low-priority wrapper:

```powershell
Set-Location 'Q:\git\sudoku.improve-generating'
. 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
Invoke-IgNode -Repo sudoku -Task '<id>' -NodeArgs @(...)
```

It admits work only after **both difficulty-v3 locks have been free continuously for45 s**, holds the
Sudoku lock, and kills at300 s. Width4 inside it is allowed: the timing slot is exclusive.

- Never use `Invoke-Dv3Node`, old MS05e launchers, another repository's wrapper, or unlocked timing.
- Do not edit the wrapper, create/delete locks yourself, override its quiet period/limit, or work around
  a wait. If its six-hour wait expires, report that; do not steal or remove a lock.
- **Every Node entry point in this pack, including generation self-tests, is launched through this wrapper.**
  Pure document/source/JSON reads and formatting are not timing experiments.
- `Invoke-IgTask.ps1` created in IG-S01 is a dispatcher, not a substitute lock implementation. It sources
  the supplied wrapper and calls `Invoke-IgNode` once per shard, releasing between shards. Its single
  documented command for a task therefore remains a sequence of <=300 s locked commands.
  The helper path is an optional `-LockHelper` parameter, defaulting to the owner-supplied path under
  `$env:USERPROFILE`; the dispatcher resolves its repository root from its own location. The absolute
  examples here identify this authorised worktree, not a hard-coded source location inside the harness.
- Internal command deadline270 s, leaving cleanup/recording margin below300. The responsive host supervises
  workers; a blocked synchronous solver must not block the deadline timer or lose all progress evidence.
- Ordinary request observation guard180 s; sample-trial guard45 s; Jigsaw diagnostic guard240 s.
  These are **research safety guards**, not changes to the10/30 s qualification or120 s application guard.
- Never start work that the admission estimate says cannot fit the remaining270 s command window.
  Record unstarted rows and use the predeclared resume mechanism for **unstarted work only**. Never repeat
  a completed/timed-out row automatically or count a killed row as a successful request.
  The host's effective deadline is also bounded by remaining task/round time after grace and cleanup;
  it does not always get a fresh270 s. Keep enough total-round headroom for the wrapper's300 s backstop
  plus admission before launching another command. A backstop failure stops the pack for review.
- The launcher journals requested/admitted/start/end times, wrapper task/arguments/exit, occupied seconds,
  charged45 s grace and excluded priority wait. A hard wrapper timeout charges300 s plus grace, not zero.
- Maintain a cumulative budget ledger. Stop before a task/shard would exceed its remaining allocation or
  the180-minute total. Anything beyond the allocations/reserve needs the orchestrator's approval.
- Scratch/partial files stay under the authorised project folders. Only the supplied wrapper owns its
  operational locks. The harness must neither write temporary-directory files nor implement another lock.

The helper must not run a task twice merely because a measurement was disappointing. A failed implementation
may be fixed and rechecked only with a new attempt id, preserved old evidence and charged machine time.

## 4. Shared harness architecture and source firewall

All tasks use `generator\tests\artifacts\improve-generating\phase0\` (abbreviated **H** below).
Common entries: `Invoke-IgTask.ps1`, `run.cjs`, `host.cjs`, `worker.cjs`, `loader.cjs`, `records.cjs`,
`manifest.cjs`, `self-test.cjs`. Modules added later are lazy-loaded; reference measurement must not acquire
an unrelated diagnostic observer as more modules are added.

1. Read the ordered `SOURCE_FILES` declaration in `generator\tests\node-runner.js`; do not execute the
   runner. Resolve every source inside this worktree, refuse missing/escaping paths, and load classic
   scripts into a fresh private VM/worker. No application/UI service is started.
2. Record SHA-256 per input, ordered runtime fingerprint, active harness/adapter fingerprints and exact
   patch transforms. Hash source before and after each command. A changed input invalidates the comparison.
3. Keep a read-only production/fixture firewall inventory. Private hooks are applied to source strings
   in memory, or files under H only. Each transform asserts unique stable function anchors; no line-number
   patching, silent fallback or source-file rewrite.
4. Do not copy MS05e's `gitState()` or execute its driver unchanged: it invokes git and has540 s assumptions.
   The new harness never invokes git, including read-only git. Commit labels are supplied provenance labels;
   content fingerprints are the checked identity.
5. Discover the current catalogue, weights, bands, floors, tiers, dimensions, guard constants and default
   attempts. Do not bake the current26-technique/rating-version2 catalogue into an algorithm. Unsupported
   hook/API shapes fail explicitly and go to Astra; never silently benchmark another implementation.
6. Reference mode executes the current native generation path. Hook/no-op parity is checked against an
   unpatched private loader. Same-puzzle comparisons cover model/structure, givens, solution, canonical
   rating, exactness and warnings; log/check/work equality is additionally required where claimed.
7. Prefer `worker_threads` inside one request-host process. CPU is read **once at the host process level**
   with `process.cpuUsage()`: it already includes its workers. Do not sum process-wide readings from each
   worker. A host runs one request at a time; no other experiment contaminates its CPU interval.
8. A native reference is a complete native pipeline request inside one worker. Pool mode splits work only
   as specified by its task. The host can terminate workers and record total CPU even if engine JS is busy.
9. Report warm-ready request wall, cold-start wall, startup, validation and cleanup separately. Primary
   request CPU includes cold startup, speculative work and termination/cleanup; also retain ready-only
   and to-decision snapshots. Headline comparisons show ready and cold wall side by side; throughput
   rates charge cold wall plus cleanup, and the on-time feasibility indicator uses cold wall to decision.
   Independent post-timing audit cost is separate. Reference and prototype use the same inclusion rule.
   Recreate the request host/pool for each request.
   **SM2 grid-trial exception:** its primary CPU/wall efficiency denominator starts at engine-ready and
   includes actual grid build, samples and trial cleanup. Report cold-inclusive rates beside it. Loading
   the entire engine for every two-sample trial must not mask the finder/search cost being compared.
   Record grid-build cost separately; a setup/12 (or native coarse-sample count) amortisation is a Derived
   sensitivity, not measured request throughput or extra independent samples.
   Record CPU API and observable resolution. Millisecond-scale samples may be below CPU resolution:
   aggregate at trial/seed-cluster level and return null when a denominator is unresolved, never infinity.
   Optional worker `threadCpuUsage` is attribution only and does not replace/sum process-wide request totals
   or imply better clock precision without evidence.
10. Validation uses an **unpatched** current engine instance after the timed interval: solution/givens,
    structure, independent uniqueness count, canonical rating and requiredness. Validation cost is reported,
    never hidden in a headline generation time. Unknown validation is not a verified exact hit.

Scalar/array equality alone is not a proof of speed portability. The measurements are Node prototypes,
not a Web Worker/browser qualification, and no offer flags are updated.

## 5. Common records and command interface

Each task writes JSON plus a markdown summary. Raw records are immutable. Atomic partial/final files must
be siblings in the same authorised evidence directory. A durable JSONL journal is allowed for crash
survival; its completed records are reconciled into ordinary `records.json`.

**Command JSON**

```text
schema: "ig-s-phase0/1"
task, shard, round, attemptId, status
evidenceStatus: "provisional (pre-freeze)" | "frozen-confirmatory"
runtimeLabel, runtimeFingerprint, runtimeFiles[], sourceStable
harnessFingerprint, adapterIds[], adapterHashes[], catalogueSnapshot
node, execArgv, platform, cpuModel, logicalProcessors, memory
manifestHash, pairOrder, plannedKeys[], completedKeys[], unstartedKeys[]
logicalBlockKeys[], physicalPlanHash
lock { wrapperPath, ownerText, expectedTask, observed }
timing { requestedAt, admittedAt, endedAt, occupiedMs, chargedGraceMs, priorityWaitMs }
exit, error, budgetLedgerReference
```

**Request/sample JSON**

```text
key, parentKey, recordKind, pairId, gridCluster, requestSeed, attempt, sample, variantId, level, mode
normalisedConfig, solverMode, poolWidth, sampleMode, parentMode, floorIds[], tierIds[]
limits, limitOrigin, serialOrdinal, consumed, speculative, origin
outcome: complete | sample-budget | request-timeout | validation-unknown | error | unstarted
timeoutScope: null | sample | request | command
generation { readyWallMs, coldWallMs, occupiedWallMs, cpuToDecisionMs, cpuTotalMs,
             cpuReadyTotalMs, startupMs, startupCpuMs, cleanupMs, readyOccupiedWallMs,
             gridBuildWallMs, gridBuildCpuMs, cpuApi, cpuResolutionStatus }
validation { wallMs, cpuMs, solutionValid, givensAgree, structureValid, unique, canonicalEqual }
claimedExact, verifiedExact, required, vacuous, shallow, achieved, score, puzzleHash
attemptsUsed, samplesUsed, canonicalRatings, localProposals, localCapReasons
counts { floorTests, floorDeductions, solverChecks, dfsEntries, dfsChecks,
         ladderPasses, phaseBSolves, deepenProposals, verificationSolves }
firstExactOrigin, firstExactOrdinal, checkpointHashes, warnings, error
```

Use explicit null/unknown, never zero for unavailable counters. Keep unconsumed speculative work in CPU
and resource reporting, but not in delivered hits. Never use a matching score label as exactness.
Request/grid-trial parent totals are the rate denominators; their sample child attribution is never summed
again. Resume only never-started parent jobs, not sample children abandoned when their parent was censored.

**Summary JSON/markdown**: coverage and exclusions; before/after paired rows; descriptive nearest-rank
p50/p95/max with n; upper median separately for comparison with historical reports; CPU/wall factors;
verified hits per CPU/wall second; sample-origin/local-origin hits; budget/censoring/error counts;
source identities; estimate-supported/refuted/inconclusive **within the implemented prototype scope**.
With n2/n3, p95 is the observed maximum, not a production-tail estimate.

Exit0 means recorded observations passed correctness checks, even if gain/hits are poor. A productive
pause with untouched keys also returns0, with `command.status=paused-unstarted`; it does not claim complete
coverage. This is necessary because the supplied wrapper rejects other exits. Incorrect output/parity is
exit1; unsupported source is exit2 and stops. Never disguise a genuine error as a successful pause.
The dispatcher may pack remaining never-started parent jobs into later admitted commands; no retry of a
started job. Wrapper failures stop the dispatcher. Preserve records and separate correctness from findings.

### Single-command entry points

After IG-S01, each task has this command (replace the task id only):
Run it from the repository root. `-LockHelper '<path>'` is available for a later checkout whose approved
wrapper is at another location; it never changes the quiet period or maximum command limit.

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S02 -Round provisional-r1
```

The dispatcher expands the exact manifest/shards defined in the task and invokes:

```powershell
. 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
Invoke-IgNode -Repo sudoku -Task 'IG-S02/<shard>' -NodeArgs @(
  'generator\tests\artifacts\improve-generating\phase0\run.cjs',
  '--task=IG-S02', '--round=provisional-r1', '--shard=<shard>'
)
```

`-PlanOnly` performs no engine execution and lists source/capabilities, row keys, shards and projected cost.
`-ResumeUnstarted <command-json>` resumes only manifest keys proved never started; no hidden retry.
All ranges in task files are inclusive literal seeds, not a seedBase/perf/soak transformation.

## 6. Populations, fixed variants and statistical interpretation

### Paired headline population H3

Every request is Nightmare, trace off, rotational180, random dig order, default variant options and the
native default attempts (8/4/2). No support override. Model construction and RNG fork labels remain native.

| Cell | Literal seeds | n | Historical planning basis, not new expected results |
|---|---|---:|---|
| mega16 | 1,2,3 | 3 | Deep80-117 s; r5p seed3 approximately107 s |
| mega12 | 1,2,3 | 3 | Deep23.5-25.3 s |
| samurai | 1,2,42 | 3 | CV3 approximately25-27 s; G13 approximately21.6 s |
| classic9 | 1,2,3 | 3 | CV3 approximately0.6-5.6 s; GD21/100 is another population |
| killer | 1,2,3 | 3 | I5/CV3 Nightmare approximately18-31 s; few exact hits |
| greaterThan | 1,2,3 | 3 | CV3 Nightmare approximately12-20 s |

Native comparison modes: `native` (mixed kinds), `proposal-only`, `ordinary-only`. The last two change
sample kind only in a private copy, retain the native named RNG forks/caps and are diagnostic algorithms.
Never describe a two-sample grid experiment as a complete default request.

### SM2 frontier variants

All operate on cells only; Killer, Greater-Than and Jigsaw remain excluded. Default phaseB reference is
the final parent, with fresh uniqueness proof. PhaseA always disables uniqueness-assuming techniques.

| ID | Floor descent | S2 | Reference parent | Additional after-DFS floor filter |
|---|---|---|---|---|
| F0 | full ladder | off | final | none |
| F1 | full ladder | on | final | none; default |
| FC | cheap | on | final | none |
| FM | middle | on | final | none |
| FU | full ladder | on | final | full canonical floor with uniqueness now proved |
| FS | full ladder | on | stored immutable snapshot | none |

Cheap = actual requested floor IDs in groups basic/locked/subset/wing; middle adds fish (including the
registered single-digit patterns). Full ladder = cheap, middle, full actual floor, deduplicating equal
rungs. All sets retain registry order and are intersected with the current floor. Other groups appear
only in the full rung. Record exact IDs; full canonical requiredness is never inferred from cheap/middle
failure. If metadata no longer implements these families, stop for the author rather than guess.

Fixed structural controls: K_F=12; at most16 deepen proposals per sample; no change to native clue/unit
floors or symmetry. These are prototype settings, not adopted production defaults. Deterministic total
count budgets are fitted from IG-S04 and frozen before IG-S05; no per-seed adaptive caps.

Pilot grid seeds11,12; screen grid seeds101-108 (8 clusters); held-out whole-request seeds201,202.
No seed is substituted after seeing results. Rotate experiment order by the index in the preregistered
seed list, never by speed or success. Preserve early-stop/skipped-first-exact and unstarted distinctions.
The first round does not supply SM2 evidence for wordoku, sohei, flower or butterfly. Samurai is not a
qualification surrogate for them. List these four cells, their separate populations and current-data
cost projections in the frozen handoff as unapproved extensions; none can be allowlisted from this pack.

### Rates, uncertainty and the gate

Report sample hits separately from grid/request returns. At most one delivered hit per grid trial/request
enters its return-rate numerator; duplicate exact samples do not become several delivered puzzles.
All spent generation CPU, including speculation/cleanup, is in that rate's denominator.

Use paired seed-cluster bootstrap (2,000 resamples, fixed analysis RNG seed20261114) for rate differences
and intervals. Resample complete paired clusters, not individual samples. Report one-sided95% lower
bounds and ordinary95% intervals; zero hits give a zero lower bound, no pseudo-count.
Intervals from three/eight clusters are **descriptive provisional intervals with poor small-sample
coverage**, not reliable confidence guarantees or a reason to decide a gate.

Also report an exact one-sided95% binomial lower bound for the full-request fraction that is independently
verified exact **and** returned within10 s (81 cells) or30 s (larger cells), with a recorded independence
assumption at request-seed level. This is a corroborating statistic, not a replacement for Fable's
rate-based feasibility projection. For orientation, a one-sided95% exact binomial lower bound >=0.5
requires at least26/40 observed on-time exact requests; that stronger requirement is not imposed here.
Use a documented tested binomial-tail inversion, not an installed statistics package.
The time in this indicator is the cold request wall-to-decision, including worker startup/model work;
the independent audit follows outside it. Ready-only wall is retained for comparison with the older Node
engine timings, never silently substituted to make the gate pass.

- `provisional-r1`: **formalGate = not-evaluable-pre-freeze**, regardless of numerical result.
- `frozen-gate`: at least40 SM2 grid-seed clusters per decision cell provide the per-kind comparisons;
  IG-S06 supplies40 paired native-mixed/selected-frontier whole requests and sample/local attribution.
  The formal input remains Q05's verified hits per CPU/wall second and the lower-bound projection to
  >=0.5 exact requests inside the budget at width4. Publish rates, uncertainty, measured pool efficiency,
  actual work/request counts and timing as inputs; the direct request fraction is beside them.
  Do not silently substitute the26/40 criterion, assume independent samples, extrapolate unlimited extra
  attempts, or invent a Poisson/hazard model. Any numeric conversion from rates to a request fraction must
  have an author/Fable-approved assumption set before being presented as the gate. Without it report
  `projection-awaits-author-review`, not an automatic go/no-go. This does not block collecting the frozen
  measurements. For positive-baseline cells, report paired rate-difference lower bounds for the stated
  non-inferiority comparison; a descriptive small-cohort interval is not a pass.
- If coverage, CPU accounting or source compatibility is insufficient, report **inconclusive**, not go.
  Nonzero baseline is not the same thing as passing90% qualification: classic9's21% does not qualify.
- S1 production allowlisting/90% offer qualification and bank routing are NOT decided by this pack.
  The author/orchestrator/Fable reviews frozen results under that gate; no developer changes its meaning.

## 7. Frozen reruns

Each task file gives one rerun command. All use the current runtime in this dedicated worktree, not a
retained pre-freeze copy. Dynamic catalogue/default discovery and adapter capability checks are mandatory.
If a future source changes a hook contract, report unsupported-source for author repair; never fall back
to the old engine or silently omit a finder.

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' `
  -Task IG-S05 -Round frozen-gate `
  -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' `
  -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

The orchestrator supplies the freeze receipt: accepted MS17b/MS18e labels, current runtime/catalogue
fingerprints, accepted limits/defaults and attestation. A flag/ratingVersion3 alone is not proof of freeze.
The budget receipt authorises the later total and source; no frozen run is charged silently to this first
round. `-PlanOnly` must work before approval and reveal the expanded40-seed cost. IG-S05 uses101-140
then; IG-S06 uses201-240 for its confirmatory modes. Other tasks keep their documented diagnostic cohorts.
No Hell generation is added automatically: a non-vacuous Hell extension requires a separate population
and budget decision.

## 8. Estimate versus measured - filled from IG-S10 `report-r3.md` §3 (provisional, pre-freeze; errata E1-E10 applied)

Do not use the joint report's midpoint as an acceptance threshold. These predictions organise experiments.
S3 is deliberately partial. The deferred IG-S06 design omits S4/S6/S7 runtime changes, stock/bank and
WebAssembly; full-request S1/S2 plus S5b composition remains unmeasured in this round.

| Report row / multiplier | Report planning anchor | Paired measured before | Measured prototype after | CPU ratio /wall ratio | Hits /CPU s /wall s | Scope, censoring, source | Verdict |
|---|---|---|---|---|---|---|---|
| mega16 Nightmare | Today 104.11 / 116.95 s (median / p95: deep requests, MS05r5m, n = 7; report, Measured); first phases 39 / 50 s (P: full S3 x S4 x S5a, S3 alone on the local continuation; equal results); all phases 11 / 14 s, envelope 3.3-44 s (P); S5a x1.7-1.8; no forecast was assigned to the partial S3 | native-w1, n = 3, trace off: ready p50 107.53 / max 116.04 s; cold p50 107.61 s; CPU p50 107.55 s | S5a w4: ready p50 55.89 / max 69.96 s (cold p50 56.00); S5a + partial S3: ready p50 54.66 / max 69.92 s; serial partial S3 (n = 1): 104.49 s | S5a ready x1.92 (1.66-1.96), cold x1.92, CPU pool/native x0.98 (0.98-0.99); partial S3 over the pool: median paired incremental ready ratio x1.01 (1.00-1.02), CPU x0.99 (S5a+S3 / native; median combined ready x1.97) | native 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a+S3 0/3 exact, 0.0000/CPU s, 0.0000/wall s | measured: S5a (min(4, A) workers) and partial S3 (singles and subsets) on 3 paired seeds; first-phase components not implemented: full S3 and S4 (S4 moves to phase 3 under the new generator version, Q04); phase-3 components not composed: S1/S2/S5b (IG-S06 deferred); S7 not implemented; 0+0+0 censored, 0 errors; n = 3 descriptive | Today: no verdict, descriptive difference: measured median 107.53 s against the median 104.11 s (+3.42 s, +3.3 %); S5a: supported (median x1.92 reaches the low end of the planning range x1.7-1.8); partial S3: no material net gain demonstrated (median paired incremental ratio x1.01, range 1.00-1.02), full-S3 forecast untested/inconclusive; first phases (original formula: full S3 x S4 x S5a, S3 alone on the local continuation): S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented (Q04 moves it to phase 3 under the new generator version): inconclusive; all phases add S1/S2/S5b (phase 3, new generator version): grid-trial prototype only, composition deferred (IG-S06): inconclusive; implemented scope reaches 54.66 s ready |
| mega12 Nightmare | Today 23.72 / 25.24 s (median / p95: deep requests, MS05r5m, n = 7; report, Measured); first phases 5.4 / 7.2 s (P: full S3 x S4 x S5a, S3 alone on the local continuation; equal results); all phases 4.6 / 5.9 s, envelope 1-15 s (P); S5a x2.8-3.0; no forecast was assigned to the partial S3 | native-w1, n = 3, trace off: ready p50 23.35 / max 23.50 s; cold p50 23.46 s; CPU p50 23.83 s | S5a w4: ready p50 7.06 / max 7.69 s (cold p50 7.18); S5a + partial S3: ready p50 6.80 / max 7.92 s; serial partial S3 (n = 1): 23.33 s | S5a ready x3.22 (3.04-3.43), cold x3.18, CPU pool/native x1.12 (1.09-1.13); partial S3 over the pool: median paired incremental ready ratio x1.02 (0.97-1.04), CPU x1.10 (S5a+S3 / native; median combined ready x3.34) | native 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a+S3 0/3 exact, 0.0000/CPU s, 0.0000/wall s | measured: S5a (min(4, A) workers) and partial S3 (singles and subsets) on 3 paired seeds; first-phase components not implemented: full S3 and S4 (S4 moves to phase 3 under the new generator version, Q04); phase-3 components not composed: S1/S2/S5b (IG-S06 deferred); S7 not implemented; 0+0+0 censored, 0 errors; n = 3 descriptive | Today: no verdict, descriptive difference: measured median 23.35 s against the median 23.72 s (-0.37 s, -1.5 %); S5a: supported (median x3.22 reaches the low end of the planning range x2.8-3.0); partial S3: no material net gain demonstrated (median paired incremental ratio x1.02, range 0.97-1.04), full-S3 forecast untested/inconclusive; first phases (original formula: full S3 x S4 x S5a, S3 alone on the local continuation): S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented (Q04 moves it to phase 3 under the new generator version): inconclusive; all phases add S1/S2/S5b (phase 3, new generator version): grid-trial prototype only, composition deferred (IG-S06): inconclusive; implemented scope reaches 6.80 s ready |
| samurai Nightmare | Today 26.74 s (maximum of two requests: CV3, MS05b3: the larger of two requests, not a median; report, Measured); first phases 10.3 / 11.6 s (P: full S3 x S4 x S5a, S3 alone on the local continuation; equal results); all phases 5.6 / 6.5 s, envelope 1.9-19 s (P); S5a x1.7-1.8; no forecast was assigned to the partial S3 | native-w1, n = 3, trace off: ready p50 24.93 / max 26.53 s; cold p50 25.02 s; CPU p50 25.56 s | S5a w4: ready p50 13.64 / max 14.83 s (cold p50 13.74); S5a + partial S3: ready p50 13.40 / max 14.53 s; serial partial S3 (n = 1): 21.40 s | S5a ready x1.79 (1.70-1.83), cold x1.78, CPU pool/native x1.04 (1.01-1.05); partial S3 over the pool: median paired incremental ready ratio x1.02 (0.98-1.02), CPU x1.03 (S5a+S3 / native; median combined ready x1.83) | native 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a+S3 0/3 exact, 0.0000/CPU s, 0.0000/wall s | measured: S5a (min(4, A) workers) and partial S3 (singles and subsets) on 3 paired seeds; first-phase components not implemented: full S3 and S4 (S4 moves to phase 3 under the new generator version, Q04); phase-3 components not composed: S1/S2/S5b (IG-S06 deferred); S7 not implemented; 0+0+0 censored, 0 errors; n = 3 descriptive | Today: no verdict, descriptive difference: measured maximum 26.53 s against the CV3 maximum of two requests 26.74 s (-0.21 s, -0.8 %); the measured median is 24.93 s (shown separately, not compared with a maximum); S5a: supported (median x1.79 reaches the low end of the planning range x1.7-1.8); partial S3: no material net gain demonstrated (median paired incremental ratio x1.02, range 0.98-1.02), full-S3 forecast untested/inconclusive; first phases (original formula: full S3 x S4 x S5a, S3 alone on the local continuation): S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented (Q04 moves it to phase 3 under the new generator version): inconclusive; all phases add S1/S2/S5b (phase 3, new generator version): grid-trial prototype only, composition deferred (IG-S06): inconclusive; implemented scope reaches 13.40 s ready |
| classic9 Nightmare | Today 4.91 / 5.72 s (median / p95: R5 cell, MS05r4, n = 12; report, Measured); first phases 1.17 / 1.7 s (P: full S3 x S4 x S5a, S3 alone on the local continuation; equal results); all phases 1.2 / 1.7 s, envelope 0.38-3.2 s (P); S5a x2.8-3.0; no forecast was assigned to the partial S3 | native-w1, n = 3, trace off: ready p50 4.98 / max 5.64 s; cold p50 5.07 s; CPU p50 5.64 s | S5a w4: ready p50 1.55 / max 1.74 s (cold p50 1.67); S5a + partial S3: ready p50 1.71 / max 1.76 s; serial partial S3 (n = 1): 5.82 s | S5a ready x3.22 (0.91-3.25), cold x3.04, CPU pool/native x1.45 (1.40-4.39); partial S3 over the pool: median paired incremental ready ratio x0.91 (0.91-0.99), CPU x1.64 (S5a+S3 / native; median combined ready x2.92) | native 1/3 exact, 0.0782/CPU s, 0.0865/wall s; S5a 1/3 exact, 0.0469/CPU s, 0.2279/wall s; S5a+S3 1/3 exact, 0.0437/CPU s, 0.2144/wall s | measured: S5a (min(4, A) workers) and partial S3 (singles and subsets) on 3 paired seeds; first-phase components not implemented: full S3 and S4 (S4 moves to phase 3 under the new generator version, Q04); phase-3 components not composed: S1/S2/S5b (IG-S06 deferred); S7 not implemented; 0+0+0 censored, 0 errors; n = 3 descriptive | Today: no verdict, descriptive difference: measured median 4.98 s against the median 4.91 s (+0.07 s, +1.5 %); S5a: supported (median x3.22 reaches the low end of the planning range x2.8-3.0); partial S3: no material net gain demonstrated (median paired incremental ratio x0.91, range 0.91-0.99), full-S3 forecast untested/inconclusive; first phases (original formula: full S3 x S4 x S5a, S3 alone on the local continuation): S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented (Q04 moves it to phase 3 under the new generator version): inconclusive; all phases add S1/S2/S5b (phase 3, new generator version): grid-trial prototype only, composition deferred (IG-S06): inconclusive; implemented scope reaches 1.71 s ready |
| Killer Nightmare | Today 17.82 / 29.98 s (median / p95: I5 per-request results, MS05b3; report, Measured); first phases 4.5 / 9.8 s (P: full S3 x S4 x S5a, S3 alone on the local continuation; equal results); all phases 4.5 / 9.8 s, envelope 2.8-17.9 s (P); S5a x2.8-3.0; no forecast was assigned to the partial S3 | native-w1, n = 3, trace off: ready p50 21.11 / max 30.44 s; cold p50 21.20 s; CPU p50 22.16 s | S5a w4: ready p50 7.97 / max 14.73 s (cold p50 8.08); S5a + partial S3: ready p50 8.46 / max 15.10 s; serial partial S3 (n = 1): 22.40 s | S5a ready x2.55 (2.07-2.65), cold x2.52, CPU pool/native x1.14 (1.12-1.22); partial S3 over the pool: median paired incremental ready ratio x0.98 (0.94-0.98), CPU x1.25 (S5a+S3 / native; median combined ready x2.50) | native 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a 0/3 exact, 0.0000/CPU s, 0.0000/wall s; S5a+S3 0/3 exact, 0.0000/CPU s, 0.0000/wall s | measured: S5a (min(4, A) workers) and partial S3 (singles and subsets) on 3 paired seeds; first-phase components not implemented: full S3 and S4 (S4 moves to phase 3 under the new generator version, Q04); phase-3 components not composed: S1/S2/S5b (IG-S06 deferred); S7 not implemented; 0+0+0 censored, 0 errors; Killer rows by hash-linked audit overlay; n = 3 descriptive | Today: no verdict, descriptive difference: measured median 21.11 s against the median 17.82 s (+3.29 s, +18.5 %); S5a: below the planning range on all 3 observed pairs (x2.07-2.65 versus x2.8-3.0); no general refutation: the x2.55 (median) pool improvement stands, and the original IG-S02 verdict (estimate-refuted (no pair reaches 2.8)) is kept as historical evidence in IG-S02/summary-r2; partial S3: no material net gain demonstrated (median paired incremental ratio x0.98, range 0.94-0.98), full-S3 forecast untested/inconclusive; first phases (original formula: full S3 x S4 x S5a, S3 alone on the local continuation): S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented (Q04 moves it to phase 3 under the new generator version): inconclusive; all phases add S1/S2/S5b (phase 3, new generator version): grid-trial prototype only, composition deferred (IG-S06): inconclusive; implemented scope reaches 8.46 s ready |
| Greater-Than Nightmare | Today 9.3 / 19.19 s (median / p95: I5 per-request results, MS05b3; report, Measured); first phases 2.2 / 6 s (P: full S3 x S4 x S5a, S3 alone on the local continuation; equal results); all phases 2.2 / 6 s, envelope 1.2-9.4 s (P); S5a x2.8-3.0; no forecast was assigned to the partial S3 | native-w1, n = 3, trace off: ready p50 11.57 / max 19.32 s; cold p50 11.65 s; CPU p50 15.50 s | S5a w4: ready p50 4.41 / max 6.31 s (cold p50 4.52); S5a + partial S3: ready p50 4.72 / max 7.12 s; serial partial S3 (n = 1): 11.45 s | S5a ready x2.62 (0.89-3.06), cold x2.58, CPU pool/native x1.58 (1.23-4.13); partial S3 over the pool: median paired incremental ready ratio x0.93 (0.89-0.93), CPU x1.73 (S5a+S3 / native; median combined ready x2.45) | native 3/3 exact, 0.0704/CPU s, 0.0933/wall s; S5a 3/3 exact, 0.0483/CPU s, 0.2405/wall s; S5a+S3 3/3 exact, 0.0433/CPU s, 0.2201/wall s | measured: S5a (min(4, A) workers) and partial S3 (singles and subsets) on 3 paired seeds; first-phase components not implemented: full S3 and S4 (S4 moves to phase 3 under the new generator version, Q04); phase-3 components not composed: S1/S2/S5b (IG-S06 deferred); S7 not implemented; 0+0+0 censored, 0 errors; n = 3 descriptive | Today: no verdict, descriptive difference: measured median 11.57 s against the median 9.3 s (+2.27 s, +24.4 %); S5a: inconclusive (median x2.62 is below the low end of x2.8-3.0 but at least one pair reaches it, up to x3.06); partial S3: no material net gain demonstrated (median paired incremental ratio x0.93, range 0.89-0.93), full-S3 forecast untested/inconclusive; first phases (original formula: full S3 x S4 x S5a, S3 alone on the local continuation): S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented (Q04 moves it to phase 3 under the new generator version): inconclusive; all phases add S1/S2/S5b (phase 3, new generator version): grid-trial prototype only, composition deferred (IG-S06): inconclusive; implemented scope reaches 4.72 s ready |
| S5a width 4 | at most 2 active attempts on two-attempt boards; x2.8-3.0 on 8/4-attempt boards, x1.7-1.8 on two-attempt boards | native-w1, n = 3 per cell (rows above) | attempts-w4: mega16 x1.92 (1.66-1.96); mega12 x3.22 (3.04-3.43); samurai x1.79 (1.70-1.83); classic9 x3.22 (0.91-3.25); killer x2.55 (2.07-2.65); greaterThan x2.62 (0.89-3.06) | CPU pool/native p50: mega16 0.98, mega12 1.12, samurai 1.04, classic9 1.45, killer 1.14, greaterThan 1.58; the pool reads CPU once at the host (speculation, startup and cleanup included) | verified exact identical in both arms in every cell: true (classic9 1/3, Greater-Than 3/3, others 0/3) | pooled == native on 18/18 pairs (identity of every digest section); two-attempt ceiling respected (mega16 peak active 2 of 2; samurai peak active 2 of 2); speculative attempts completed and discarded: mega16 0, mega12 0, samurai 0, classic9 1, killer 0, greaterThan 3; early-exact regressions (first exact at attempt 1): classic9:2 x0.91, greaterThan:1 x0.89; n = 3 descriptive; no censoring; above 120 s: 0 | supported on mega16, mega12, samurai, classic9; Killer: below the planning range on all 3 observed pairs (x2.07-2.65 versus x2.8-3.0); no general refutation: the x2.55 (median) pool improvement stands, and the original IG-S02 verdict (estimate-refuted (no pair reaches 2.8)) is kept as historical evidence in IG-S02/summary-r2; Greater-Than: inconclusive (median x2.62 is below the low end of x2.8-3.0 but at least one pair reaches it, up to x3.06) |
| Partial S3 | same check/failure sequence (parity); no gain forecast was assigned to the partial scope (the report's x1.3-1.65 is the full-S3 planning range) | native-w1 / attempts-w4 baselines of IG-S02 (reused, never rerun) | scoped-native-w1 (n = 1 per cell on 6 seeds) and scoped-attempts-w4 (18 requests): mega16 serial 1.03 (n = 1), median paired incremental 1.01 (1.00-1.02); mega12 serial 1.01 (n = 1), median paired incremental 1.02 (0.97-1.04); samurai serial 1.01 (n = 1), median paired incremental 1.02 (0.98-1.02); classic9 serial 0.97 (n = 1), median paired incremental 0.91 (0.91-0.99); killer serial 0.94 (n = 1), median paired incremental 0.98 (0.94-0.98); greaterThan serial 1.01 (n = 1), median paired incremental 0.93 (0.89-0.93) | serial x0.94-1.03, median paired incremental over the pool x0.89-1.04 per request; CPU pool+S3/pool x0.97-1.13 | verified exact unchanged on 24/24 scoped requests (24 request identities digest-equal to IG-S02) | PARTIAL: naked/hidden singles (3 finders, no checks) and the six naked/hidden pair/triple/quad finders (replayed checks); 17 other techniques (pointing, box/line, fish, wings, chains, cages, inequalities) stay native full scans; skipped scopes charging two or more virtual node checks covered by engine-free tests only; no naturally binding ceiling captured (boundary-injected only) | parity supported (SM4 sufficient for these families on this runtime: 18 saved puzzles x 4 solver sets equal, 770 injected failures equal in ordinal, site and error fields, four deliberate mutations detected, 0 audit violations); no material net gain demonstrated within the partial scope; full-S3 forecast untested/inconclusive (17 families and the cache overhead unmeasured; SM1 conditional scenarios are not ceilings) |
| S1 F0/F1/FC/FM/FU/FS: sample cost and yield kept apart | a hit-rate lever, not a speed lever: a near-constant per-sample cost, time per sample divided by about 1 (81 cells), 1.2 (144), 1.5-2 (multigrids), 3 (mega16) (report.md:35-36, 108); yield (p) unmeasured, decided by SM2 | native kinds, 8 grid clusters per cell: proposal-only and ordinary-only, 0 verified hits in 64 trials; 0 exact of 128 native samples (89 shallow) | six frontier variants x 4 cells x 8 clusters = 192 trials: 0 verified hits; budget-ended frontier trials per cell: classic9 0, mega12 0, mega16 12, samurai 1 | COST (separate from yield), F1 sample CPU over the equal-weight native mix of the same grids: classic9 x0.38 (F1/ordinary x0.25, F1/proposal x0.80); mega12 x0.28 (F1/ordinary x0.17, F1/proposal x0.83); mega16 x0.12 (F1/ordinary x0.07, F1/proposal x0.78); samurai x0.23 (F1/ordinary x0.15, F1/proposal x0.50). The near-constant-cost planning expectation was not observed for this prototype and cohort; the cheap work is attributable to unsuccessful, empty or above-band outcomes: classic9 16/16 empty unique frontiers, 0 above-band candidates; mega12 12/16 empty unique frontiers, 7 above-band candidates; mega16 2/16 empty unique frontiers, 24 above-band candidates, 2 count-budget stops; samurai 15/16 empty unique frontiers, 1 above-band candidates; no exact, shallow or below-band candidate in any cell. Equal weighting matches the observed ordinary/proposal counts of the four SM1 requests (48/48, 12/12, 24/24, 12/12; IG-S07/summary-r2.md lines 78-88); it remains a sample-cost comparator, not whole-request throughput, and early stopping can change the realised mix | YIELD: 0 verified hits in every mode and cell, native controls included (rates and all 104 paired intervals: 104 degenerate, 0 [0, 0]); sample-origin 0, local-origin not measured (no local continuation in these trials). Cost per verified exact puzzle is unestablished (no hit to divide by) | two-sample grid trials on the pre-MS07 catalogue, reference solver, width 1; whole-request recovery and local search excluded; classic9, mega12, mega16, samurai only (wordoku, sohei, flower, butterfly: not measured); selection F1 is a non-winning diagnostic default in all four cells; held-out outcomes unmeasured; the S2 isolation is the next row | cost: F1 samples cost 0.38 / 0.28 / 0.12 / 0.23 of the native mix on classic9 / mega12 / mega16 / samurai, not the near-constant cost the planning expectation gave, and the cheap work belongs to unsuccessful, empty or above-band outcomes; yield: inconclusive (no demonstrated exact-yield benefit and no refutation: 0 hits include the native controls); cost per verified exact puzzle unestablished; separate problems kept apart (empty unique frontiers, shallow or above-band candidates, count-budget stops); formal gate not-evaluable-pre-freeze; no S1 drop and no S9 routing implied |
| S2 isolated: F0 versus F1 | S2 re-derivation early exit of removal tests: "a removal test costs a few deductions, not a solve" (plan.md:99), part of the S1 + S2 per-sample divisor (report.md:107-108) | F0 (frontier without the re-derivation): mean sample CPU ms classic9 27.19, mega12 115.38, mega16 524.56, samurai 211.88 | F1 (with the re-derivation), the same grids and samples: mean sample CPU ms classic9 29.00, mega12 128.88, mega16 528.25, samurai 224.63 | F1/F0 CPU, statistic: ratio of the mean sample CPU over the same samples of the same 8 grid clusters per cell (8 grid clusters (grid seeds 101-108), at most two samples per grid, the same grids and samples in F0 and F1, reference solver, width 1 (n = 16 samples per mode)): classic9 x1.07, mega12 x1.12, mega16 x1.01, samurai x1.06 (1.01-1.12); ratio of the cohort totals of ready CPU: classic9 x1.11, mega12 x1.14, mega16 x1.01, samurai x1.05; median of the 8 paired per-cluster ready-CPU ratios (min-max): classic9 x0.90 (0.49-4.00), mega12 x1.05 (0.78-1.89), mega16 x1.00 (0.91-1.20), samurai x0.99 (0.82-1.44) (dispersed at n = 8) | n/a (cost row); F0 and F1 take the same decisions in every cell (floor tests, candidates, outcomes equal): classic9 true, mega12 true, mega16 true, samurai true; 0 verified hits in both | paired population: 8 grid clusters (grid seeds 101-108), at most two samples per grid, the same grids and samples in F0 and F1, reference solver, width 1 (n = 16 samples per mode); KEPT SEPARATE: correctness and deduction-saving evidence (F1 accepted removals by re-derivation instead of a full proof: classic9 362 of 427 (84.8 %); mega12 662 of 736 (89.9 %); mega16 1170 of 1241 (94.3 %); samurai 2041 of 2128 (95.9 %); S2 audited on the IG-S04 pilot: 48 trials, 120 removals, 0 correctness problems); not generalised: whole requests, other cells, larger floors and the deduction-saving mechanism are not isolated here | no CPU saving on this cohort: F1/F0 CPU x1.01-1.12 (mean sample CPU, same 16 samples per cell); correctness and deduction-saving evidence is reported separately and is not contradicted by this; not generalised to "S2 never helps" |
| S5b composition | samples parallel; local continuation remains per attempt (never four lanes on a two-attempt board) | not measured | not measured | n/a | n/a | IG-S06 (held-out requests 201/202, N1/CA4/CQ1/CQ4, quota protocol) is DEFERRED for the pre-freeze round: no implementation, no run, no record; the full-request composition of S1/S2 with S5b is unmeasured | inconclusive: deferred, unmeasured (not passed, not refuted); see the frozen-rerun plan for when to implement and run it (after the frozen SM2 review and a separate budget approval) |
| SM1 shares | mega16 samples ~90 %, local ~10 %; G13 (samurai) ~72 % / ~28 %; mega12 83 %; classic9 ~53 % (a fitted component share) | nine profiled native requests, n = 1 per cell, instrumented wall (not the before/after timing evidence) | sample / local share of engine-root wall: mega16 90.5 % / 9.5 % (P 90 %, +0.5 points); mega12 83.5 % / 16.4 % (P 83 %, +0.5 points); samurai 72.8 % / 27.2 % (P 72 %, +0.8 points); classic9 60.3 % / 39.6 % (P 53 %, +7.3 points) | profile overhead (profiled / unprofiled ready wall) beside each cell in the report JSON; chains (`nishio`, `forcingChain`) about 81 % of the mega16 and 77 % of the mega12 profile (hotspots, not cacheability) | n/a (attribution); sample / local share of the Nightmare profiles without an anchor: killer:nightmare:3 57.9 % / 19.3 %; greaterThan:nightmare:3 57.0 % / 42.9 % | n = 1 per cell; Killer and Greater-Than have large non-finder shares (Killer DFS 45 %, Greater-Than local search own code 25 %); S3 scenarios are CONDITIONAL zero-cost figures, not full-S3 ceilings; frontier phase A per-finder wall unmeasured (counts and phase wall only); pre-MS07; observed 74-331 solves per ordinary sample in the four SM1 requests, so the plan's 1,296 solves per sample and its "10x fewer solves per sample" are withdrawn as representative costing and speed-up premises (section 7) | descriptive, no verdict (n = 1 per cell, no threshold is set by the pack): sample-share differences to the report in percentage points mega16 +0.5, mega12 +0.5, samurai +0.8, classic9 +7.3; Killer and Greater-Than have no sample/local anchor |
| SM3 Jigsaw 1111 | historical 325.313 s (I5 n = 20, one request); stage unknown | historical 325.313 s, uninstrumented, not remeasured (a 400 s command would break the 300 s ceiling) | censored at 240.015 s (guard 240 s), CPU at least 238.55 s, no puzzle; control seed 1100 ready-wall factor 1.16 (n = 1) | n/a: a censored lower bound is not a completed latency; cumulative full-grid contexts 99.5 % | n/a (no puzzle) | one instrumented request, censored by the 240 s Jigsaw guard; the instrumented run passed the 120 s application guard which does not establish uninstrumented latency; counters of the running search are in none of the completed counts; per-attempt counts unknown, not reconstructed; no safe ceiling inferred | supported as an attribution (full-grid search, Q07 option (b)), censored: lower bound 240.015 s; consistent with, not proof of, the historical 325 s being the same stage |
| Greater-Than Normal / Q16 | MS05e: 22.1 % of the Normal misses end at the clue floor (named trap); 95 % is a request-group cost, not a stage share | G0 (native sign pass), trace SUMMARY: Normal 20 pairs ready 41.30 s; Nightmare 6 of 10 pairs 51.95 s | G1 (sound-solve-first, first technique pass only): Normal 40.08 s; Nightmare 305.89 s | G0/G1 ratio of cohort totals: ready wall Normal 1.030, Nightmare 0.170; CPU (incl. startup and cleanup) Normal 1.034, Nightmare 0.214 (a value below 1 means G1 took longer) | verified exact samples per cohort: Normal 18 of 394, Nightmare 6 of 175 (the split is identical in G0 and G1: true); named trap 83/376 of Normal misses, 19/169 of Nightmare misses | trace SUMMARY cohort, never the trace-off headline; Normal 20/20 pairs, Nightmare 6/10 (a partial, budget-limited cohort: 706-709 UNSTARTED, eight rows; the recorded requests completed); 26/26 pairs identical (digests, ratings, sign decisions, semantic counters), no guard-binding difference; `counts.dfsEntries` in the records are countSolutions CALLS (erratum applied); probes: 15 executed group checks plus 15 reused rows; two singleton observer controls; no global G1 winner, no production adoption | named trap: 22.1 % of Normal misses end at the clue floor against 22.1 % in MS05e (descriptive, no threshold; minimality 83/83); the 95 % is the request-group share (94.3 % here) while the measured local-stage share is 71.3 %; G1: modest Normal benefit (x1.030), substantial Nightmare regression (x0.170, six pairs, a partial, budget-limited cohort: its recorded requests completed and eight rows were unstarted); no global winner (cohorts differ) and no production adoption |
| SM5 pool width sweep 1 / 2 / 4 | S5a in Node worker_threads with 1, 2 and 4 workers on mega12 and classic9 Nightmare: identical puzzles and wall time; decides the pool design and the message cost (plan.md:366) | not measured | not measured | n/a | n/a | UNMEASURED: no 1 / 2 / 4-width sweep exists for classic9 or mega12. IG-S02 compared the serial native run (width 1) with the pool at width min(4, A) on six cells and 3 seeds; the effective two-worker operation on the two-attempt boards (mega16, samurai) is not the missing width-two comparison on classic9 and mega12 | unmeasured (not passed, not refuted); added to the frozen proposal (D9, A7) and no run is authorised |
| Restricted-floor performance probes | restricted-floor (and prefix) probes of the new test costs: an accepted floor test, a refused floor test at each floor level, a DFS uniqueness check, a full solve (clarifications.md:186, 503; report.md:42, 136, 263) | not measured | not measured | n/a | n/a | UNMEASURED: no probe times these operations in isolation. The existing floor parity evidence (equal floor decisions of the equal-result checks and the F0/F1 comparison) is not that experiment; the frontier trials count floor tests and report a phase-A wall share, not a cost per operation kind | unmeasured (not passed, not refuted); added to the frozen proposal (D9, A7) and no run is authorised |

## 9. Review and execution summary

Pack cross-review is by opus-ig. Implementations are reviewed by the orchestrator; scientific/design
questions route to Astra. An accepted task means correct tooling/evidence, not a successful speed hypothesis.
All documents/scripts: CRLF, UTF-8 without BOM, no trailing whitespace, final newline.

Opus's16 findings are addressed in this revision. Substantive changes are engine-ready SM2 rates;
large-board-first pilot/reprojection; prioritised, packed SM2 work; optional large-board CQ1; explicit
keeper replay; Fable's rate gate rather than a substituted request-fraction test; named uncovered cells;
filtered/reused Greater-Than validation; conservative unfitted budgets; exact subset keys/check replay;
and descriptive small-cohort intervals. Two qualifications: per-thread CPU does not itself improve clock
resolution (aggregate instead), and the optional unlocked-analysis exemption is not taken (its45 s grace
is already budgeted). The source-firewall finding was confirmatory. This review also corrected productive
pause exit handling for the supplied wrapper. No measurements or production changes were made by the author.

| Task | Status | Source /evidence | Machine charged /priority wait | Review /issues | Milestone |
|---|---|---|---|---|---|
| IG-S01 | Accepted | harness `64b1e386…`; `evidence/phase0/provisional-r1/IG-S01/` | 237.0 s of 240 s /about 362 s waits | author fix round (4 fixes + `runtimeFingerprint`); self-test 36/36; real pause/resume | M0 harness |
| IG-S02 | Accepted | harness `c4f3a6e0…` (generation `dd759a22…`); `evidence/phase0/provisional-r1/IG-S02/` | 1,399.9 s of 1,500 s /3,000 s waits | Killer verifier rule and re-audit; pool bug fixed; 18/18 pairs identity-ok | M1 pool baseline |
| IG-S03 | Accepted | harness `baeb9ea2…`/`dedddaef…`; `IG-S03/summary-r3` | 1,307.2 s (+90 s approved) /960 s waits | partial S3: no material net gain; SM4 parity sufficient for these families | M2 S3 parity |
| IG-S04 | Accepted | harness `694eea9b…` (trials), `98016f2c…` (corrected); `IG-S04/summary-r2`, `budgets-r2.json` | 828.3 s (cap 1,050 s with 330 s approved) /1,318.5 s waits | 64/64 trials, 0 exact hits; budgets frozen; correction round | M3 frontier pilot |
| IG-S05 | Accepted (inconclusive) | harness `58c583c2…` (screen), `f297ca31…` (closure); `IG-S05/summary-r2` | 841.3 s of 2,880 s /about 4,810 s waits | 256/256 trials, 0 hits in every mode; degenerate intervals labelled; IG-S06 deferred | M3 screen |
| IG-S06 | Deferred (pre-freeze) | 2026-11-15 scheduling decision above; no IG-S06 measurements | Not run | No winning frontier variant; not passed or refuted | M4 deferred |
| IG-S07 | Accepted | runs `0feb1ea57bd4`, r2 `5027a528f03a`; `IG-S07/summary-r2` | 710.6 s of 720 s (+12 s admission) /1,185 s waits | chains 77-81 % of mega profiles; conditional scenarios; loop check 13/13 | M4 SM1 |
| IG-S08 | Accepted | runs `fe2bae1efce6`, r3 `82b623923934`; `IG-S08/summary-r3` | 336.4 s of 360 s /90.3 s waits | seed 1111 censored at 240.015 s; full-grid DFS 99.5 % (attempt 4, after restart 50); Q07(b); no ceiling changed | SM3 (no milestone) |
| IG-S09 | Accepted (partial) | commands `9da69f60…`, r2 `d414ebac…`, harness `bbd5db2da6cd…`; `IG-S09/summary-r2` | 895.7 s of 990 s (+90 s observer-control) /914.2 s known waits | Normal 20/20, Nightmare 6/10, controls 2/2; eight rows unstarted; G0/G1 totals Normal 1.030, Nightmare 0.170; F1-F5 closed | Q16 diagnostic (no milestone) |
| IG-S10 | Accepted | run `9a8afa85b3ff…`, r2 writer `8f0018b5c36d…`; `report-r2.md` | 53.5 s of 240 s /1,347.9 s waits; round 6,610.418 s of 10,800 s | reconciliation 480 keys, 118/118; gate not-evaluable-pre-freeze; F1-F4 closed | M5 round closed |
