# MS18d — Final performance matrix and full hash check

| Header | Value |
|---|---|
| Depends on | MS18c accepted at `e0596801`; acceptance recorded by `34ebc3fc`; owner MS18d-Q1 and reviewed per-cell admission before timed work |
| Accepted base | `e0596801cf95d79761073a344ffc2e60f7764c8f`; pack-only acceptance descendant `34ebc3fcb36aa97361b9da18c1e63903128bf747` |
| Size / active time | Medium; 40-55 minutes including preflight tooling, plus GP/GG |
| Owner / milestone | Performance evidence; M18d |
| Authority | R24/R21, FS23, S-OD4; S-AV01 not offered; S-OD13 is GQ-only, not a GP waiver |
| Status | READY FOR PHASE A FILE-ONLY PREFLIGHT; GP/profile held for owner MS18d-Q1 and bounded admission; Sohei Hell 2 already exceeds the mean-alert limit |

## Goal & business context

Measure every offered performance-table cell, not a convenient fast subset, and verify all fixed
puzzle hashes after publication. A hash-only pass is not a timing gate.

## Scope and repository rules

In: published qualification-derived target rule, full GP, full GG check and evidence.
Out: performance-driven algorithm tuning, arbitrary target relaxation, canonical hash rewriting.
AGENTS/checklist; no developer Git writes, pack edits or task-log edits. The
orchestrator owns implementation commits and dispatch. All local Node commands
and timed work use `Invoke-Dv3Node`, ordinary **450 s projected / 540 s hard**,
with shared slot/locks and task-owned transcripts. No GQ watchdog, warmup, pilot,
unsupported split, permanent perf-tool edit or new slow-cell evidence class.

## Inputs & context

**MS18c is accepted**, not a pending prerequisite. SA1 FINAL ACCEPT/C1 and the
orchestrator's exact-closure-head local checks are recorded in the MS18c leaf and
check-list. A **`6a473f7a`**, B **`387a4c8d`**, closure **`e0596801`** remain
distinct. GQ is **135/135**, **79 offered / 56 hidden**, measured at `ed2fe50c`,
dirty, sources **`0ca29eaeebc295b6`** under the declared host-active policy.
The publication/accepted producer is **`75b0955e3e356bd1`**; no generator
algorithm/default/limit changed in closure. All **2,201** frozen GQ files and
**591** final `-b` entries were verified. Do not edit any accepted MS18c evidence.
The single authoritative merged input is
**`docs\difficulty-v3\evidence\MS18c\merge\qualification-v3.json`**, not a
top-level duplicate. Preserve its measured source metadata and the A/B support-only
publication proof; a publication-only source-hash change is not permission to retag
GQ or manufacture a new measurement.

| Bound input at the accepted base | SHA-256 / identity |
|---|---|
| `merge\qualification-v3.json` raw bytes | `b8e546fc0ba5bd1f79f408984bf3bf8f82559305ea6bd63cbe6dc53beff0df04` |
| `generator\tests\perf.js` raw bytes | `7395472b46bcfe7f93f805efc1fc4747003da43e2fa53645ec0ae6a25e8f9a60` |
| `generator\tests\fixtures\perf-helper.js` raw bytes, before target updates | `d64f8b3c207f94fb8c2ce614c480ca06d96f5d9015e66ca6368bba43b59b1724` |
| `generator\tests\fixtures\tool-records.js` raw bytes | `eec5e268287f0543fb3e1677b293b64c75618d68f50e7f176573dbb1729367c6` |
| Accepted E hash-family source identity | `1032ab2f510fe2b9ed1bac744f534d5cfee7e039f456fc56d3e19682d53158a0` |

These are different identities/recipes, not interchangeable hashes. Read the five
accepted quick/manual/E identities in MS18c's acceptance note. The starting
quick counts are **4,807 Generator / 2,981 Player**, 55/32 suites, timings
547.6/118.7 s. Manual `variants` is already **285/285**; five other manual suites
and `perf`, including the extra-regions cross-level hit-share risk, belong to
MS18e. No full manual rerun is added here. MS18c's matching-head condition was
**local**; no remote CI pass was supplied or inferred.

**Step-5 target-table alignment is not target recalibration.** The joint MS18c
ruling nulls the 39 newly hidden `PERF_TARGETS` positions and design 9.1 entries,
preserving all 79 offered target values. Its existing perf consistency assertion
stays unchanged. Use that explicit published-only baseline here; do not reinsert
hidden targets. The two manual warn-only smoke selections change from Greater-Than/
Normal and Wordoku/Normal to their offered Easy levels, with the original five-run
smoke protocol. They are not GP measurements or changes to the complete 50-run GP
matrix/seeds, fixed diagnostics or regression recipes.

Carry **MS18c-GQ-ENGINE-COST** into the existing cost analysis: SA1's reported
matching-outcome ratios are about 1.13 overall and 2-6.6x in several named cells;
MS18c separately records a stricter 2,122-pair comparator and its exact selection
rule. Preserve/reconcile definitions, keys, counts and both source identities
before quantitative attribution. This is a source-specific engine-cost signal,
not jobs-1 GP, identical-puzzle proof, a target adjustment or an extra profiling/
GQ campaign. Closure additionally measured **mega16-replay 331.6 s versus 118 s
at MS07f**, above a **300 s projection** but inside 450, and identified **17 offered
cells above their existing performance targets**. Keep the replay pair's request/
source/clock separate from GQ/GP cohorts and from the 17 target calculations.
Use existing records and this task's already authorized GP/profile scope/bounds.
IR17 is also carried because classic9 Nightmare remains offered;
the old 430.5 s GD observation is not a new whole-command bound or a GD assignment here.

R24, verbatim:

> Final GP measures 50 runs per offered performance-table cell, records p50/p95/max and the aggregate
> published success criterion. Hash mode is not a timing gate.

Use existing seedBase 7000, seed i=7000+i*101, trace summary, warmup 0, runs 50 and existing
nearest-rank percentile. The full intended matrix is perfTools.cells() after final offers.
Every offered level must have a documented performance target; do not omit a newly offered cell.
Aggregate success requires >=90% of these cells meeting their target, not 90% of chosen requests.
Individual misses remain visible. A crash/missing result is not merely a slow cell.
The intended matrix is **79 cells / 3,950 requested generations**. A complete
>=90% result needs **at least 72 of 79 cells**, and every cell must first have a
complete 50-run result. Do not use a rounded printed percentage or a completed-only
denominator. Missing/unadmitted cells make the full GP result **incomplete**, even
if a numerical lower bound on successes already exceeds 90%.
The perf CLI uses strict **`p95 < target`**; qualification uses **`p95 <= budget`**.
There is **no `SG_TIME_FACTOR` multiplication of CLI GP targets**.

## Dispatch boundary and owner action

Only **Phase A, file-only preflight**, is ready for dispatch now. The MS18c
acceptance prerequisite is recorded, but **no GP or S-AV11 timed payload is released**.
Return the complete preflight/target proposal to the orchestrator and stop.
Phase B target/docs/GG work and Phase C timing require their separate releases.

### MS18d-Q1 — OWNER: final performance measurement environment

**Prepared, unanswered; send through the orchestrator to the owner, not Fable.**
S-OD13 explicitly authorized host-active **GQ**, not GP. All **140** MS18c raw
strict screens failed; the resident CLI host was PID **1968**, .NET StartTime
`2026-11-13T19:26:33.6916441+07:00`, CIM UTC microseconds
`2026-11-13T12:26:33.691644Z`, parent **18780**,
`C:\Users\ledat\AppData\Local\Microsoft\WinGet\Links\copilot.exe`.
This is recorded history, not a new liveness check or a GP exception. Reconfirm
the actual instance before any new admission; do not exempt all Copilot processes.
The 140 failures do not prove a strict sample can never pass. This question asks
for an explicit measurement-regime decision, not a waiver inferred from history
or an owner stop for one ordinary environmental hold.

Choose **one policy for the whole new GP matrix and the separately recorded S-AV11 profile**:

- **A — explicitly authorize `MS18d-GP-host-active`.** Keep the raw five-interval
  strict screen and `ready` separate from named-policy `admitted`. Verify the named
  host, own/foreign locks and per-instance counters; hold for any additional
  consumer at **>=0.5 CPU-s per elapsed second**, unknown/invalid required facts,
  or known foreign heavy work. No service/whole-process-tree exemption.
  The requested grant includes **one >=60 s fresh-slot re-ask only after a verified
  unstarted additional-consumer hold**, maximum two admission attempts per immutable
  cell/protocol identity. A second hold is an unexecuted gap, not a failed/hidden cell.
  No sampling loop, payload retry or quota reset.
- **B — retain the strict-quiet policy without exception.** The orchestrator must
  supply a credibly quiet execution window/environment, with five one-second
  intervals **mean <=0.5 / max <=1.0 busy logical cores**, valid counters and no
  known foreign heavy work. A check after a wait must be fresh. Do not hunt lucky
  windows/retry until green; holds return to the orchestrator. Any different
  machine/Node is explicitly recorded and kept uniform for the whole GP matrix.

For **both** choices: actual observed times and the **pre-GP-fixed** targets remain
binding; serial jobs 1, **50 runs**, trace summary, warmup 0, `7000+i*101`,
strict `p95 < target`, the full intended denominator and ordinary **450/540**
protection are unchanged. No CPU subtraction, target inflation from GP results,
faster-repeat selection, new guard, new split or GQ watchdog follows. S-OD14's
one-recovery permission was **GQ-only** and is not inherited.

**The scope limit matters:** even option A does not admit Sohei Hell 2:
its existing FS23 mean alert is **485.597 s >450**, before setup/margin.
It stays in the 79-cell denominator as unmeasured unless a separately authorized,
credible bounded route exists. A readiness decision neither extends a deadline
nor makes an incomplete GP gate pass. No automatic second owner question/tooling
task is raised merely for that cost finding; FS23 already specifies its disposition.

**Owner-ready Vietnamese wording:**

> **MS18d-Q1 — môi trường đo GP:** S-OD13 chỉ cho phép GQ host-active, chưa cho GP.
> Anh chọn **A**: cho GP và profile S-AV11 chạy theo chính sách
> `MS18d-GP-host-active`, vẫn lưu màn hình strict; chặn tiến trình khác dùng
> >=0,5 CPU-s/s, chỉ hỏi lại một lần sau >=60 s cho CPU hold chưa chạy payload;
> hay **B**: giữ máy thật yên theo strict và bố trí phiên/máy phù hợp?
> Cả hai giữ 50 mẫu/ô, jobs 1, trace summary, warmup 0, seed và target chốt trước
> khi đo; không trừ CPU, không chọn lần chạy nhanh hơn, không nới 450/540.
> Riêng Sohei Hell 2 đã có cảnh báo 485,597 s >450 nên chưa được chạy; chọn A
> không cấp thêm thời gian, và còn thiếu ô thì không công bố GP hoàn tất.

Record the verbatim answer and task-scoped policy before Phase C. Until then:
metadata/planning only in Phase A; no live readiness/no-op campaign, pilot or
timed measurement to choose the policy. Phase B's non-GP functional work may be
separately released after its review without pretending Q1 is answered.

### Readiness and runtime obligations once released

- Obtain the orchestrator's shared window and normal mutex for **each** cell;
  Pentomino was already stopped by the owner, so do not ask for that pause again.
  Reconfirm no new competing work. Keep actual release/acquisition times and the
  **>=15 s gap**, with observations after acquisition and immediately before payload.
- Use a task-owned bounded admission/transcript wrapper, not edits to the shared
  helper or accepted MS18c helpers. Reuse/copy reviewed mechanics into **MS18d-owned**
  paths; do not recreate/write MS18c's deleted `.last-release` or accepted records.
  Bound each PowerShell/CIM query at <=15 s and readiness at <=45 s; a timeout
  is an unstarted hold, never evidence of idle. Include setup/readiness in the
  whole-command projection and 540 s protection.
- Declare the timed window: no other agent generation, tests, hashing, formatting
  or analysis during the payload, including sub-ten-second commands. Only minimal
  supervision/status reads and the already-declared negligible control-plane HTTP
  poller/report are allowed. No optional CPU sampler inside the measured cohort.
- One fresh CLI process, **one cell**, one contiguous **50-run** `measure` call;
  no warmup/prefetch, process-priority change, internal restart or independently
  detached payload. Audit any wrapper/tool wait so it does not truncate the
  existing 540 s envelope or leave an orphan. Status reads reset no deadline.
- Freeze sources, targets, policy, Node/machine, selected request and output identity
  before the first timing and verify them before each admission. Never mix policies,
  machines, targets or producer versions into one claimed final matrix.
- A complete legitimate `MISS` is retained, never repeated for speed. A crash,
  timeout, compromised window or missing result is **incomplete**, not a slow-cell
  pass/fail record; preserve traces and use the existing evidence-failure routing.
  No automatic GP recovery grant or cherry-picking is supplied here.

## Qualification-derived targets — before GP, not after it

The existing target rule is already authorized. For each offered cell in global
level order, with raw GQ p95 **q** and board budget **b** (both milliseconds):

- If the existing positive target **t** is not outgrown (**q<=t**), **keep t**.
- Otherwise propose **`min(b, max(previousApplicableTarget, ceil(3*q)))`**;
  the preceding applicable target is the already selected target of the previous
  offered level of that variant (0 if none). Hidden/null entries are not candidates.
- The keep rule takes precedence: do not cascade increases into the **62** cells
  whose existing target still meets GQ, or enforce new global monotonicity on them.
  Do not repeat v2's Easy-from-Normal migration on unchanged v3 bands.

The accepted input gives these **17** proposed changes. Phase A must reproduce them
file-only and show q, old target, predecessor, unclamped ceil and budget for every
row; the orchestrator reviews the complete table before Phase B writes it.

| Cell | GQ p95 ms | Old target ms | Proposed target ms |
|---|---:|---:|---:|
| classic4/veryEasy | 10.1122 | 10 | 31 |
| classic6/veryEasy | 12.9032 | 10 | 39 |
| classic9/easy | 780.3884 | 150 | 2342 |
| classic9/normal | 875.5958 | 150 | 2627 |
| classic9/expert | 440.7861 | 400 | 1323 |
| classic9/nightmare | 2792.0346 | 2500 | 8377 |
| mega12/nightmare | 6280.4697 | 3000 | 18842 |
| mega16/hell2 | 25239.0671 | 10000 | 30000 |
| diagonalX/nightmare | 5368.3201 | 3000 | 10000 |
| hyper/normal | 524.3035 | 200 | 1573 |
| hyper/nightmare | 8503.0273 | 3000 | 10000 |
| jigsaw9/easy | 634.7225 | 350 | 1905 |
| jigsaw9/hell2 | 6102.2380 | 5000 | 10000 |
| killer/normal | 1808.2659 | 700 | 5425 |
| sohei/hell2 | 27155.5581 | 20000 | 30000 |
| butterfly/nightmare | 16120.4641 | 8000 | 30000 |
| wordoku/easy | 973.6330 | 250 | 2921 |

These are a rule-derived target proposal, **not launch permission or GP results**.
Keep all 56 hidden positions absent and all public support arrays unchanged.
Never adjust a target after seeing GP. Any genuinely undefined/mismatching policy
case is a QUESTION, not permission to omit a cell or choose an easier budget.
Update `PERF_TARGETS`, design 9.1 and both developer guides together in Phase B.
The separate manual-suite `BUDGET_MS`/CV6 assertions remain unchanged; distinguish
their retained contracts from updated GP targets instead of silently weakening
them. No Normal-specific contract is reopened.

**CV6-05 / S-AV01 is settled: "not offered".** Normal has 40/40 hits but p95
10,192.4051 ms >10,000 ms. It is not in the 79-cell GP population; the Fable trigger
did not occur. Keep its null public target, original 700 ms manual CV6 contract
and fixed diagnostic seed 4. No Normal run, new budget or contract step is assigned.
S-AV16/S-AV17 are withdrawn current-source items, not outstanding pool regressions on this source.

GG retains all 26 combinations x 20 fixed seeds, including now-hidden requests through the MS03d
diagnostic guard. Record fresh complete shards for current source/helper identity; compare only.
### Current code/command audit — accepted `e0596801`

| Anchor | Actual contract |
|---|---|
| `perf-helper.js:36,57,80` | Nine columns; now 79 positive target entries; `cells()` intersects targets with current published support |
| `perf-helper.js:95,116` | Nearest-rank percentile; `measure()` runs one synchronous serial cohort, seeds `seedBase+i*101`, trace summary by default, returns `times` in memory |
| `perf.js:118,436,471-524` | Argument parsing and timing route; `--runs=50 --warmup=0 --seed=7000 --gate --ascii`, one selected variant/level; strict unrounded comparison |
| `perf.js:157,165,250` | Engine loader and hash-mode identity; `--hash-list` is file-only; hash identity includes normalized engine/helper/tool text |
| `pipeline.js:138,168` | `run()` drives `runSteps`; absent caller budget remains `budget || null` |
| `replay-fixtures.js:218` | Exports `loadFixtures`/`nodeEnv`; guarded CLI main, suitable for a file-only metadata loader |

Important consequences:

- **Do not `require('perf.js')` for metadata:** its final `main()` call is
  unconditional. Use the existing `loadFixtures` API with the needed fixture
  scripts, `--hash-list`, or read the bytes; never accidentally launch default GP.
- Timing mode has **no `--json`, `--from`, resume, timing-ledger merge or `--jobs`
  option**. Jobs 1 is inherent, not a CLI flag. Hash selectors shard **hashes only**.
  No `--quick`, `--alloc`, seed/count split or arbitrary preload is permitted here.
- `measure()` passes no caller budget, and the pipeline keeps it null. **Do not
  import GQ's 120000 ms request guard or its structural ceiling formula into GP.**
  Existing internal work caps remain; the whole-command 540 s watchdog is the
  backstop. Adding a per-request timeout would change the experiment.
- Stock timing output contains **rounded** p50/p95/max/mean and the exact
  internally computed `ok`/`MISS` decision. Raw per-request `times` exist only in
  memory; the CLI does not persist them or per-request `stats`. Record that
  limitation, not invented zeros, raw outcomes or fake precision. This brief
  assigns no new timing capture mode or perf/measure patch.
- Preserve stdout/stderr/exit/argv/source/policy metadata for every unique run.
  A complete single-cell header, row and terminal **1-of-1 or 0-of-1** result on
  the 50-run invocation establish completion under the unchanged tool. Use its
  **unrounded verdict**, not a comparison of rounded printed p95/target.
  Exit 1 plus a complete `MISS` is a performance miss; exit 1 without a complete
  record, a timeout or crash is incomplete. Never treat either as the other.
  `measure()` does not catch generation errors and continue like GQ's per-request
  recorder; do not insert zero-time/error rows, skip seeds or patch that behavior.
- A task-owned file-only reporter may aggregate these transcripts, checking exact
  cell/source/target/policy agreement and the 79-key population. It does not
  create a new measurement, reconstruct raw times, merge percentiles or select
  repeats. Keep a complete-result count separately from the success count.

### PR-S2 remarks — performance evidence, unchanged scope

Fable's answer (`92a7693`, `docs/difficulty-v3/clarifications-resolved.md`) leaves MS05e-MS18e
unchanged at that review; CV6-05 subsequently sets MS05e aside and fixes the Normal handoff above.
The following notes belong to the existing performance/item reporting; they add no
new scope, cap, budget, performance target or generator change.

- **S-AV11 stage profile:** when this task measures performance, obtain a stage profile of the
  single recorded Jigsaw request (`jigsaw9`, Expert, seed 1111; 325.313 s in MS05b3).
  Expert is now hidden by qualification: retain this assigned diagnostic request
  under a restored diagnostic-only support guard, never a public re-offer or changed seed.
  The original `jigsaw.test.js` recipe is **trace off**, no variant-option or
  max-attempt override: `700 + 4*100 + 11 = 1111`, size-default **8** attempts.
  Current anchors are `generatePuzzle` at **804** and `puzzleRun` at **814-820**.
  Do not substitute GP's summary trace or recovery-profile's one-attempt mode.
  Use the existing pipeline stage timings/recording facilities, retaining the request's trace/options
  and the measured source identity. Keep this identified diagnostic separate from the unchanged
  50-run GP populations, seeds, warmup and aggregate. Until the profile identifies its stage, do not
  describe the historical 325 s as a dig cost. If the delay no longer reproduces, say so rather than
  assigning a cause to the old run. Use the existing lock/projection/guard rules; no guard is raised
  and no broad search for more outliers or new profiling tool is authorized by this remark.
  The old **325.313 s is not a current-source admission bound**; the stage/cause
  remains unknown. Phase A reports its available basis or explicit unknown;
  no profile launches without a defensible <=450 s whole-command plan and Q1 release.
- **Existing request counters:** where per-request records are already written, retain the existing
  `stats` counters, including `samples`, `attempts` and `oracleCalls`, with the source/request/default
  metadata. Preserve their actual scope and available values; do not replace missing data with zero
  or infer whole-request totals from a returned sample's counters. They are the baseline for the
  later improvement feature, not a new telemetry or schema project in this task.
- **S-AV03 wording:** on the source reviewed in PR-S2, mega16 Nightmare fails the 30 s qualification
  budget by its work ceiling, not as a tail. Keep historical and final-source measurements distinct.

The profile informs which unbounded piece might be guarded **later**; it authorizes no repair here.
`docs/improve-generating/plan.md` is saved for a separately authorized future feature and must not
be implemented as part of this performance task.

### Mandatory preflight before any GP invocation (FS23)

**File-only pack-author check, no GP/pilot run:** all 79 offered GQ cells have 40
outcomes. The arithmetic mean alerts sum to **3803.9658065 s**, excluding setup,
readiness, variance and gaps; this is **not a GP runtime forecast**. Largest alerts:

| Cell | GQ mean ms | `50*mean/1000` seconds |
|---|---:|---:|
| sohei/hell2 | 9711.9411975 | **485.597059875** |
| butterfly/nightmare | 6068.4327875 | 303.421639375 |
| mega12/hell2 | 4774.1268125 | 238.706340625 |
| butterfly/hell2 | 4499.643625 | 224.982181250 |
| greaterThan/hell2 | 4498.4928800 | 224.924644000 |
| mega16/hell2 | 4119.4028300 | 205.970141500 |
| samurai/master | 4115.6179625 | 205.780898125 |

**MS18d-GP-BOUND-sohei-hell2** is already an unadmitted mean-alert item:
485.597 s >450 even before allowances. Thirteen cells also have
`50*observed GQ maximum >450 s`; those maxima are descriptive, not future bounds.
Do not promote the other **78** cells to "safe" because their means are below
450. Each still needs a source-qualified whole-command planning basis, explicit
setup/readiness/variance margin and an orchestrator-reviewed admission.
An unsupported or unknown estimate stays unadmitted; do not invent a multiplier
just to fit a ceiling or add a pilot to obtain one.

The final GQ record already has raw `cells[].requests[].ms` for this candidate. First project
every final offered cell as `50 * mean(requests.ms)`, retaining errors in the observed times and
requiring complete, finite, non-negative data. Use the arithmetic mean, not a mean of shard
percentiles. Retain the GQ source identity, actual sample count, mean/p50 and projected seconds.
Enumerate **all final offered cells from the published support arrays**, including any awaiting
a new performance target; do not let an absent old PERF_TARGETS entry hide a cell.

GQ uses trace off/jobs 4 and different seeds; GP uses trace summary/jobs 1.
The mean calculation is a **scheduling alert, not a conservative upper bound**,
an equality or a claimed GP result. Flag every mean alert >450 seconds, then keep
separate the reviewed admission projection with startup/readiness/variance margin
within 450 and the hard 540-second ceiling. Report the full table and flagged
cells to the orchestrator **before the first GP command**, not only when one times out.
Missing/inapplicable GQ data also blocks this preflight; it is not a zero-millisecond estimate.

If a cell is flagged or lacks an admissible whole-command basis, do not launch it.
Under S-OD4 create a named final-cost
item and continue other credibly bounded cells; there is no automatic new tooling task/evidence
class. This task does not own `perf.js`/`measure` changes or an unsupported CLI. Keep every
flagged cell in the intended denominator and mark its measurement incomplete, not passed.
Do not compute a complete >=90% verdict from only the cells that finished.
`--seed=9525 --runs=25` is not a valid split: it adds a cold start and printed percentiles cannot
be merged. A separately decided protocol change would need its own authorization; preserve
50 original requests, seeds, percentile computation and cold/warm semantics unless
that decision says otherwise. Do not claim raw per-request GP storage that the
stock CLI does not provide.

Implement a read-only task-owned `project-gp.js` in the artifact directory below. It accepts
`--qualification=<file> --json=<file>`, loads declarations via
**`replay-fixtures.loadFixtures`**, reads published `difficultySupport` independently
of `PERF_TARGETS`, and joins each `(variant,level)` to the
validated final qualification requests. It generates no puzzles and mutates no support array.
Write `{qualificationHash, qualificationEngine, publishedCells, projections, flagged,
targetProposal, inputs}` with the fields above, stable cell order and CRLF.
Include full request count/mean/p50/p95/max, the mean alert, current target,
formula/predecessor/budget/proposed target, source/tool/Node/machine identities,
and any distinct proposed admission basis/margin or explicit unknown. Bind the
accepted qualification SHA and the documented support-only publication proof;
do not reject or retag it merely because producer 75b differs from measured 0ca.
Require all **79** published keys to have the expected offered GQ records/targets,
keep hidden cells absent and preserve all current target/null positions.
The helper emits **no timing/admission approval**.

Print the flagged/unknown list. Exit 2 for missing/invalid
input, 1 when complete projections flag any cell, 0 otherwise. Exit 1 prevents those commands,
not the rest of the task; retain the named items and intended matrix. Missing/corrupt qualification
input must be resolved, never guessed as a zero-cost cell. Phase A also writes a
short protocol/deadline/readiness audit and the S-AV11/cost-item dispositions, then
**STOP** for the orchestrator; it does not proceed automatically into target
edits or timed work when arithmetic is green.

## Files to create/modify

- Only MS18d-owned evidence/artifacts; preserve every MS18c record and inventory.
  Final report: `docs\difficulty-v3\performance-v3.md`, with actual completeness,
  declared environment, target arithmetic, source/machine and all item dispositions.
- Task-owned read-only `generator/tests/artifacts/difficulty-v3/MS18d/project-gp.js` and
  synthetic tests; `docs/difficulty-v3/evidence/MS18d/gp-preflight.json`, its
  target/protocol/admission audit and frozen helper/output hashes. No generation
  in Phase A and no permanent new perf tool in this scope.
- After release only: task-owned bounded admission/transcript and file-only
  aggregation helpers, per-cell readiness/command records under
  `evidence\MS18d\gp\<variant>-<level>\<run-id>\`, S-AV11 records under
  `evidence\MS18d\s-av11\`, and complete GG ledgers under `evidence\MS18d\hashes\`.
  Never overwrite a run or write inside the accepted MS18c trees.
- `generator/tests/fixtures/perf-helper.js` PERF_TARGETS only if the documented qualification rule
  requires it; corresponding Generator design 9.1 and both developer guides.
- Clarify GP-target versus retained manual-CV6 wording if needed, without changing
  a manual `BUDGET_MS`, test threshold, seed or population.
- No production code, `perf.js`/`measure` behavior, `regression.js`, replay/help
  expectations or other canonical fixture. All Git/PR actions stay orchestrator-owned.

## Implementation steps

### Phase A — ready now, FILE-ONLY, then STOP

1. Read the accepted MS18c handoff, bind the input/source hashes, current 79 public
   cells/targets, Node/machine and S-AV01/S-OD7 dispositions. Keep the 50-cell
   MS13c and 37-cell MS15b histories separate from this final 79-cell population.
2. Implement/test the read-only preflight and reproduce the full 79-row table,
   17 target proposals, Sohei mean alert and distinct per-cell admission bases/
   unknowns. Include the S-AV11 original tuple, unknown/current basis and cost-item
   reconciliation. Format/freeze the helper and outputs; do not mutate sources,
   targets, offers, old records or global settings in this phase.
3. Audit the stock CLI, clocks, output limitations and full deadline chain.
   Record MS18d-Q1 as unanswered. No live sampling/no-op campaign, generation,
   pilot, GP, S-AV11 or GG generation. **Return to the orchestrator and STOP.**

### Phase B — target/document update and functional evidence, explicit release

4. After the orchestrator verifies Phase A, apply **only** the rule-derived 17
   targets (or return any mismatch as a QUESTION), with design 9.1 and both
   developer guides. Freeze the complete target table and source identities
   **before GP**; keep every other positive target and all hidden/null cells.
5. Test metadata/target consistency and capture final hash-family identity.
   Re-record all **520** GG keys in existing bounded hash shards and merge-check
   against unchanged expectations. Target literals change the hash-family identity
   even though they are not puzzle-generation code. Keep all 26 combinations,
   hidden diagnostic requests and original seeds. No canonical update flag.
   This is functional/hash evidence, **not GP**. Its ordinary shared-slot/bound
   rules still apply. It may be separately released while Q1 timing remains held.

### Phase C — timed GP/profile, separate owner-policy and admission release

6. Require the recorded **owner answer to MS18d-Q1**, frozen targets/inputs and
   the orchestrator's declared timing window and reviewed per-cell admission plans.
   Choose no policy/ceiling yourself. The mere absence of a mean alert is not GO.
7. Run each admitted GP cell once as a full 50-request original CLI invocation.
   Retain complete `MISS` results. Do not start Sohei Hell 2 or any other
   unsupported/unbounded cell under unchanged estimates. Record these in the
   intended denominator with a named unmeasured reason and no fabricated verdict.
8. Run only the already-assigned S-AV11 fixed profile if its own current-source
   bounded plan is approved. Keep its trace-off/default-attempt request, restored
   diagnostic guard, stage data and limitations separate from GP.

### Phase D — aggregate and close honestly

9. Validate all transcripts/cell keys/source/target/policy/Node/machine bindings.
   **79 complete results and >=72 successes** are required for a complete pass.
   Missing cells leave the result incomplete, not a pass of a reduced matrix.
   Record every timing miss, error, compromised run, hold and unmeasured item.
10. Finish applicable guide/count/fingerprint changes before both complete bounded
    quick sets; maintain CI metadata/projections by the existing rule. Any
    unexpected output change is a QUESTION before corrective/canonical writes.
    No automatic replay-wire/analysis/help rewrite or extra generation campaign.
11. Return the complete GP status, final 520-key check and inherited/new item
    register for **orchestrator review**. Include S-AV01 not offered, S-OD7,
    closed S-AV27, IR17, **MS18c-GQ-ENGINE-COST**, **MS18d-GP-BOUND-sohei-hell2**,
    S-AV11 and the older source-qualified S-AV31/S-AV33/S-AV34/S-AV36-S-AV39 /
    MS15b-GP-J/U records. S-OD4 permits continued safe work after cost findings,
    not an incomplete/failing gate labelled green. No developer commit/push.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18d-B01 | Published performance is measured on the entire offered table |
| MS18d-B02 | No target or hash is changed to conceal a failure |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18d-T01 | Every measured cell completes the unchanged serial 50-run CLI protocol; missing cells are explicit, not substituted, split or retried |
| MS18d-T02 | Complete GP pass only with all 79 cells measured and at least 72 meeting strict unrounded p95 < target; all misses/errors/unknowns retained |
| MS18d-T03 | Fresh complete 520-key GG matches; any target changes follow only the documented rule |
| MS18d-T04 | Full preflight precedes timing; every >450-second projection has an explicit item/outcome, and missing/corrupt input is not hidden |
| MS18d-T05 | Phase A stops; owner MS18d-Q1 answered and recorded before GP/profile; declared policy, fresh per-cell readiness, ordinary deadlines and window integrity preserved |
| MS18d-T06 | All 17 target updates derive from frozen GQ before GP; 62 retained targets/56 hidden positions unchanged; no manual-CV6 or output-fixture relaxation |
| MS18d-T07 | Stock CLI limitations reported honestly: no timing JSON/resume/jobs flag or inherited GQ guard; complete MISS distinguished from crash/timeout and rounded output from exact verdict |

## Test plan and gates

**Phase A only is ready.** From Generator, create and fake-test the named file-only
driver, load the shared helper without modifying it, then preflight:

```powershell
Set-Location Q:\git\sudoku\generator
. .\tests\artifacts\difficulty-v3\MS18c\invoke-dv3node.ps1
Invoke-Dv3Node -Task MS18d-preflight -AllowExit1 -NodeArgs @('tests\artifacts\difficulty-v3\MS18d\project-gp.js', '--qualification=..\docs\difficulty-v3\evidence\MS18c\merge\qualification-v3.json', '--json=..\docs\difficulty-v3\evidence\MS18d\gp-preflight.json')
```

`-AllowExit1` preserves the known mean-alert outcome, not acceptance of an unsafe
command. Test synthetic 40/100-request inputs, every invalid/missing/duplicate
key, nonfinite/negative ms, a 10,000 ms mean ->500 s flag, exact 450 boundary,
and unflagged-but-unadmitted status. Test target keep/equality/update, predecessor
floor/cap, hidden-null exclusion and no cascade into kept cells. Prove metadata
loading does not call `measure`/pipeline/generation or `perf.js`'s main.

After Q1/release, fake-data tests of admission/reporting cover valid/missing
counters, host/lock mismatch, eligible hold/re-ask without payload, complete
`MISS` versus crash, duplicate/mixed/missing cell results and **71/79 not passing
merely because a displayed percentage rounds to 90**. Do not test these policies
with real GP/pilots before release.

**Later payload examples, not current authorization.** A task-owned readiness
wrapper under `Invoke-Dv3Node` must build this unchanged GP argv for one admitted
cell after fresh sampling; a direct command alone does not satisfy readiness:

```powershell
node tests\perf.js --variant=classic4 --level=veryEasy --runs=50 --warmup=0 --seed=7000 --gate --ascii
Invoke-Dv3Node -Task MS18d-GG -NodeArgs @('tests\perf.js', '--hash-key=classic4/veryEasy', '--hash-from=0', '--hash-count=5', '--hash-record=..\docs\difficulty-v3\evidence\MS18d\hashes\classic4-veryEasy-00.json')
Invoke-Dv3Node -Task MS18d-GG-merge -NodeArgs @('tests\perf.js', '--hash-merge=..\docs\difficulty-v3\evidence\MS18d\hashes', '--check-hashes')
```

Persist each command's transcript under evidence/MS18d with its exit code. Complete all E hash
identities before merge; no --update-hashes. Jobs 1/no --jobs. Use the separately
reviewed per-cell admission projections, not the raw mean alerts or an assumed
1-540-second allowance. The historical duration estimates are not bounds.
**Announce the plan, obtain the shared slot and record
each timed cell's owner-approved readiness policy and observations.** Include in-command readiness in
the admission projection. Enforce the 540-second process ceiling; do not silently split runs
with changed cold/warm timing semantics. If no authorized safe route exists, retain a named
unmeasured-cost item and the incomplete aggregate rather than create another tooling task.
For target/docs changes: focused Generator `--suite=perf-tooling,smoke,help`,
then both complete bounded quick sets on the final fingerprints, all through
`Invoke-Dv3Node`. Add no suite or CI membership change for task-owned fake tests.

## Definition of done & handoff

Return the recorded Q1 decision/policy, full preflight and distinct admission
bases, intended/completed cell coverage, immutable target arithmetic/source tuple,
all raw transcripts and the actual aggregate verdict (incomplete where appropriate),
complete GG evidence and the cumulative item list.
S-OD4 allows continuing after a performance miss, not claiming a failed release gate passed.
Any proposed change to a recorded performance contract still needs its owner/delegated decision
(not an inherited S-OD13/S-OD14 grant); an authorized
implementation change invalidates affected final evidence.

## Resume rules — S-OD4

Review: orchestrator only. Correctness/evidence corruption or changing a recorded decision stops;
performance findings remain named numerical items with actual failed/incomplete verdicts.
Use `Invoke-Dv3Node` for all local Node/timed work, <=540 s; do not invent another evidence
class/tooling task for a slow cell. If docs/targets change, verify the current bounded quick manifest.
Return the complete inherited/new item list to MS18e; no suite addition is authorized here.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |
