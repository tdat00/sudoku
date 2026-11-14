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
| [ ] | IG-S01 | [01](01-harness-and-records.md) | Isolated loader, manifests, safety and records | owner instruction | 60-120 min | 4 min | Common trustworthy baseline and CPU/wall accounting |
| [ ] | IG-S02 | [02](02-headline-baseline-and-attempt-pool.md) | Paired headline baseline and S5a width4 | IG-S01 accepted | 90-150 min | 25 min | Six Nightmare rows; S5a and the two-attempt local limit |
| [ ] | IG-S03 | [03](03-scoped-solver-and-check-parity.md) | Small S3 prototype with virtual-check parity | IG-S02 accepted | 2-3 h | 22 min | S3 multiplier; S3+S5a headline requests |
| [ ] | IG-S04 | [04](04-frontier-prototype-and-budget-pilot.md) | S1/S2 variants and staged budget pilot | IG-S03 accepted | 2-4 h | 12 min | Measure large-board cost before admitting the rest |
| [ ] | IG-S05 | [05](05-paired-frontier-screen.md) | Prioritised paired SM2 screen and yield rates | IG-S04 accepted | 45-75 min | 48 min | Native kinds/F1 first; extensions only within allocation |
| [ ] | IG-S06 | [06](06-composed-request-confirmation.md) | Held-out full requests and ordered sample lanes | IG-S05 accepted | 90-150 min | 24 min | Direct before/after headline rows; S5b composition versus projections |
| [ ] | IG-S07 | [07](07-sm1-profiles.md) | SM1 stage/finder profiles and overhead | IG-S06 accepted | 60-90 min | 12 min | Sample/local/finder shares behind the time factors |
| [ ] | IG-S08 | [08](08-sm3-jigsaw-attribution.md) | Bounded SM3 Jigsaw tail attribution | IG-S07 accepted | 30-60 min | 6 min | Jigsaw Expert seed1111, not a guessed tail fix |
| [ ] | IG-S09 | [09](09-greater-than-diagnostic.md) | Greater-Than miss split and solve-first diagnostic | IG-S08 accepted | 60-90 min | 15 min | Q16; S-AV01; sign-pass and local-work assumptions |
| [ ] | IG-S10 | [10](10-reconcile-and-freeze-handoff.md) | Results reconciliation and frozen-rerun handoff | IG-S09 accepted | 30-60 min | 4 min | Every estimate versus its measured scope; provisional gate report |
| | Reserve | author/orchestrator approval only | Splitting unstarted work or investigated failures | explicit approval | | 8 min | Never an automatic rerun allowance |
| | **Total** | | | | | **180 min** | **172 planned +8 reserve** |

Milestones: M0=IG-S01; M1=IG-S02 (first paired headlines); M2=IG-S03; M3=IG-S05;
M4=IG-S06; M5=IG-S10. The orchestrator commits/pushes accepted work at these boundaries.
No parallel developers or independent generation commands in this worktree.

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

## 8. Estimate versus measured - orchestrator fills after review

Do not use the joint report's midpoint as an acceptance threshold. These predictions organise experiments.
S3 is deliberately partial; the composed run omits S4/S6/S7 runtime changes, stock/bank and WebAssembly.

| Report row / multiplier | Report planning anchor | Paired measured before | Measured prototype after | CPU ratio /wall ratio | Hits /CPU s /wall s | Scope, censoring, source | Verdict |
|---|---|---|---|---|---|---|---|
| mega16 Nightmare | Today104/117; all-phase scenarios roughly10-12 s median | | | | | | |
| mega12 Nightmare | Today24/25; after roughly4-5 s | | | | | | |
| samurai Nightmare | Today27; after roughly5-6 s | | | | | | |
| classic9 Nightmare | Today4.9/5.7; after roughly1.2 s | | | | | | |
| Killer Nightmare | Today17.8/30; roughly4-5 s, no S1 | | | | | | |
| Greater-Than Nightmare | Today9.3/19.2; roughly2-3 s, no cell frontier | | | | | | |
| S5a width4 | At most2 active attempts on two-attempt boards | | | | | | |
| Partial S3 | Same check/failure sequence; unmeasured gain | | | | | | |
| S1/S2 F0/F1/FC/FM/FU/FS | Yield, not an assumed10x solve saving | | | | | | |
| S5b composition | Samples parallel; local continuation remains per attempt | | | | | | |
| SM1 shares | Mega16 samples~90%, local~10%; G13~72%/~28% | | | | | | |
| SM3 Jigsaw1111 | Historical325.313 s; stage unknown | | | | | | |
| Greater-Than Normal/Q16 | MS05e22.1% named trap;95% request-group cost, not stage share | | | | | | |

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
| IG-S01 | | | | | |
| IG-S02 | | | | | |
| IG-S03 | | | | | |
| IG-S04 | | | | | |
| IG-S05 | | | | | |
| IG-S06 | | | | | |
| IG-S07 | | | | | |
| IG-S08 | | | | | |
| IG-S09 | | | | | |
| IG-S10 | | | | | |
