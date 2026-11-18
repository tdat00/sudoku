# MS18c — Final qualification and live offered levels

| Header | Value |
|---|---|
| Depends on | MS18b accepted; resolve MS18c-Q1/Q2 below and record the executable contract before dispatch |
| Accepted base | `14d8c903` (MS18b); runtime candidate remains `57c1b10`, R5 256 / C4 reconfirmed |
| Size / active time | Medium; 35-50 minutes plus GQ |
| Owner / milestone | Qualification/publication; M18c |
| Authority / review | R24/R21, AUTH-S1, SA1-Q-S5, S-OD4 (c1), S-OD7/S-OD8, CV6-05; SA1 cross-review |
| Status | Pack prepared; full execution/publication dispatch BLOCKED pending MS18c-Q1/Q2, not delegated to developer assumptions |

## Goal & business context

Let complete final evidence determine availability, with S-OD7's additional owner-directed
withholding of Killer Hard/Expert. Preserve the v2 record and keep the live table at its existing path.

## Scope

In: full 135-cell GQ-final, v2 archive, live table/support arrays, stored-request notification and
diagnostic/publication compatibility of the final offers; CV6-05's final S-AV01 disposition before GP.
Out: solver/generator tuning, weight changes, intermediate table publication or dropped cells.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. This is the explicit exception permitting the live
`docs/difficulty-rating/qualification.md` update, not edits to other dated reports.

## Accepted handoff and owner actions

MS18b is accepted at **`14d8c903`**, with **360/360** outcomes in 30 comparison cells,
44 locked payload commands, all DIAGNOSTICS PASS, 145 reporter checks and no admission
holds/gaps/re-asks. R5 **256** is reconfirmed: 64 loses classic9 Normal 11 -> 10 and
Nightmare 12 -> 11, 128 loses Normal 11 -> 10; 256 loses none and reduces Jigsaw Expert's
upper median full ratings **1215 -> 1104** against none. C **4** is reconfirmed,
**36/36 versus 20/36** at C6, no tie. The orchestrator independently derived both
rules and reproduced 24 decisive rows; those rechecks do not enlarge either population.
Use `evidence/MS18b/evidence.md`, `decision-packet.md`, `selection.json` and the final
**`helpers-sha256-r1.txt`** reporter revision (including incomplete exit 4).

| Action / decision | Current disposition |
|---|---|
| MS18b R5/C keep/change or replacement implementation | **None open.** Both values reconfirmed; no retune, version change or replacement task follows. |
| S-OD7 Killer Hard/Expert | **Already decided.** Withhold until later calibration; no in-v3 weight change. Keep both in GQ and preserve raw verdicts. |
| S-OD4 (c1), large-board Nightmare/Hell availability | **Already decided.** Apply final qualification without exception; no permission to retain a failing offer is pending. |
| S-OD11/S-OD12 and earlier acquisition/limit questions | **Resolved.** Preserve their dispositions; no new scan/limit permission transfers here. |
| **MS18c-Q1: final qualification measurement environment** | **Open before GQ.** MS18a/b's descriptive host-active exception does not authorize a GQ timing gate. Options below. |
| **MS18c-Q2: complete qualification execution route** | **Open before full dispatch.** Current 450 s admission/540 s process-tree ceiling and indivisible cell protocol do not supply a credible complete 135-cell route. Options below. |
| CV6-05 Greater-Than Normal fallback contract | **Conditional later, not an unconditional start dependency.** Only if final Normal qualifies and its final-source CV6 still fails: return numbers to Fable under the already recorded delegation, before MS18d. No budget value selected now. |
| A variant with no qualified/offered level, unexpected publication incompatibility | **Conditional blocker if observed.** No invented passing level or silent population change. Assign the compatibility decision/fix through the orchestrator. |

Thus the index's former "MS18b + owner actions" does **not** mean an unanswered R5/C
decision. It now names Q1/Q2 explicitly. This preparation requests decisions; it does
not record either option as approved. Do not dispatch a developer to discover these
same two policy questions by running. A separately assigned read-only preparation is
not permission for GQ, publication or a qualifier/tool change. Record the owner/Fable
answers and amend this pack to the chosen executable contract first; SA1 retains
cross-review of MS18c's code, protocol/evidence and publication.

### Baseline identities

| Surface | Accepted baseline |
|---|---|
| Generator quick | **4784 / 55 suites**, 542.0 s; `274067a0beb67a595f711be792ed2625193d2549ee8ec9a8bfc795cc8ef73b3c` |
| Player quick | **2981 / 32 suites**, 117.2 s; `5e55cec60307ec6c0d4235d5e07b63934cabb4f1fe077da40b99277e5576d14c` |
| Replay E | `ff55cbce4c34034d501ee495417e7c69da953143c9f74a4bae4f5b722d719421` |
| Hash E | `b1c78ecbcf3a0e4bb0d6a1f661f235e5f9ce63e4b3756dc3260892ac19270a58` |
| Qualifier engine at `14d8c903` | `engine.sources = 0ca29eaeebc295b6`, 46 loaded source files; **not** the soak, quick or E identity |
| Qualifier tool at `14d8c903` | `qualifierHash = c0ef0d25f28518692bdccbde547814daf74f5834d35f9e117108d6321876fd77` |

The qualifier identities above were computed file-only by its actual hashing recipe;
no qualification was run for pack preparation. Recompute after any authorized input
edit, including locale bytes if changed. Its source list skips Generator UI/worker
files but includes the variant definitions; its tool hash includes `qualify.js` and
`fixtures/qualification-records.js`. Do not substitute another family's hash.
Rating/cache **3**, history/worker wire **1**, grouped proof **2**, catalogue/GH **40**
(34 unscoped) remain. CI projections are **170/70/70/50/330/30/80/90**, Player job
**180**, in the established shard order. Maintain counts/projections only by the
existing quick rule after actual relevant verification; no membership/factor change.

## MS18c-Q1 — uniform GQ readiness: decision required

The named Copilot host **PID 1968**, created
**2026-11-13T19:26:33.6916441+07:00**, cannot be made quiescent while this orchestration
session operates. Pentomino is stopped; PID 17588 is idle, not exempt. MS18b's raw
strict screen failed in **40/44** executed commands and passed in **4/44**, despite
zero additional-consumer holds. MS18a had **24/32** executed strict failures and two
transient service holds, both resolved at attempt 2. Aggregate CPU attribution remains
incomplete; these facts do not prove that the CLI alone consumes all non-idle CPU.

It would be inaccurate to say the numerical screen can **never** pass: four did.
But the available environment is not host-quiescent, and occasional lucky windows or
retry-until-green do not establish a uniform strict-quiet 135-cell measurement regime.
**The current GQ readiness contract is not executable as a promised complete run on
this session without a decision.** Do not quietly inherit MS18b's descriptive-only
admission or claim that waiting on an async command removes the host.

Choose and record one uniform condition before the first GQ cell:

- **A — approve declared host-active GQ on this machine** (recommended, not approved): use the verified
  named-host/no-other-heavy-job admission, raw five-interval screen recorded separately,
  unchanged >=0.5 CPU-s/s additional-consumer hold, no OS-service/tree exemption,
  and at most one >=60 s fresh-slot re-ask for a verified **unstarted** eligible hold.
  Use a new explicit GQ policy identity and cell-aware attempt records. **Actual raw
  generation p95 remains binding**, with the original 2/10/30 s budgets, jobs 4,
  40/100 seeds and 120000 ms request guard. No subtraction, scaling, relaxed budget,
  CPU-based miss waiver or selection of faster repeats. Unlike GS, these times would
  decide offers under the approved declared environment, not merely be descriptive.
- **B — require strict-quiet GQ outside the active orchestration host**: arrange an
  external run while the CLI/agents are actually stopped, or a separately approved
  quiet runner. Freeze a compatible source/Node/machine/protocol and run the entire
  matrix under that one environment; no mixed-machine merge or claimed equivalence
  of MS18a/b timing. This does not by itself solve Q2's per-command limit.

Neither is authorized by this text. A gives no GP waiver; MS18d still needs its own
declared measurement contract. The same chosen condition must be settled for the
conditional CV6 timing in this task, with its unchanged assertion, before it runs.

**Vietnamese question for owner/Fable — Q1:**

> GQ dùng p95 để quyết định mức được cung cấp. CLI PID 1968 không thể nghỉ khi phiên
> còn hoạt động; MS18b trượt màn CPU-idle 40/44 lần, nhưng không có job nặng khác.
> Chọn **A**: cho phép GQ trên máy đang chạy CLI, ghi rõ môi trường và dùng nguyên
> p95 thực đo/ngưỡng 2/10/30 giây, jobs=4, không trừ CPU hay nới chuẩn; hay **B**:
> dừng phiên/đổi sang runner yên tĩnh và đo toàn bộ 135 ô ở đó? Chưa chạy GQ.

## MS18c-Q2 — command bounds and the complete matrix: decision required

### What the current qualifier actually does

At this base, **one variant/level is the smallest supported GQ unit**. `parseArgs`
has no `--from`, seed-count shard, checkpoint or resume flag. `--probe` is explicitly
not qualification. `--merge` combines complete cell records; splitting a cell creates
a duplicate or invalid/incomplete record, not a resumable qualification.
The CLI can select several cells, but batching does not create within-cell checkpoints
or guarantee that workers survive a late expansion. It is not a proof that a slow
cell fits. No padding/dummy requests or whole-matrix command evades the ceiling; a
different routing plan needs its complete bound and measurement semantics reviewed.

The first 40 requests use up to four workers. In a one-cell invocation, workers leave
when the queue drains; if the final first-round result triggers expansion, only that
last worker remains for the **60 serial** requests (S-AV27). `--jobs=4` does not mean
25 waves for all 100. Early stopping is valid only when the actual recorded proof
supports it, with in-flight requests drained; no advance credit from earlier 0/12
samples, predicted non-offering or a previous source's short run.

`out.ms` measures pipeline generation. The independent solution/DFS uniqueness check
runs **after** that timer, before the worker replies: it belongs to command bounds,
not the p95 data. The 120000 ms generation guard is **per request**, not per cell.
The output JSON is published only after the whole invocation completes. A process
kill/worker/IPC failure leaves no valid resumable cell; it is not a hidden verdict.

For illustration, a valid 100-request cell taking **8 s/request** can meet the 10 s
p95 budget yet require about **(40/4 + 60) x 8 = 560 s**, before setup/validation.
It can have 35 first-round hits and 55 further hits, so no early stop saves it.
This is protocol arithmetic, not a measurement: the 540 s ceiling does not bound
all valid qualification executions.

### Evidence available now, not a launch authorization

The six unexecuted MS07e projections remain **556, 1246, 1808, 919, 3957 and 4032 s**
for mega12/Hell 1, mega16/Nightmare, mega16/Hell 1, Greater-Than/Expert,
Greater-Than/Hell 1 and Butterfly/Hell 1 respectively. They are **older-source
projections**, not current-source outcomes or reusable bounds.

File-only current-production cost indicators from the twelve MS18a rows per cell
(same producer as `14d8c903`; different seeds/routes/concurrency from GQ) are:

| Cell | Mean generation s | Observed maximum s | 70 x mean s | 70 x maximum s |
|---|---:|---:|---:|---:|
| classic9 Normal | 0.262 | 1.172 | 18.3 | 82.1 |
| classic9 Nightmare | 1.233 | 5.072 | 86.3 | 355.1 |
| classic9 Hell 1 | 11.247 | 13.475 | 787.3 | 943.2 |
| Killer Hard | 5.360 | 6.538 | 375.2 | 457.7 |
| Killer Expert | 20.296 | 40.274 | 1420.7 | 2819.2 |
| Jigsaw Expert | 6.952 | 13.628 | 486.7 | 954.0 |
| Jigsaw Nightmare | 8.690 | 18.759 | 608.3 | 1313.2 |
| Greater-Than Normal | 3.201 | 7.915 | 224.1 | 554.1 |
| Greater-Than Expert | 8.317 | 16.366 | 582.2 | 1145.6 |
| diagonalX Nightmare | 1.706 | 5.826 | 119.4 | 407.8 |

These are **generation-only scheduling warnings**, not GQ projections fit for admission:
they omit worker startup, validation, variance and jobs-4 effects. Small values do
not authorize a run; large ones show why a blanket <=450 s claim is unsupported.
Do not use C6's diagnostic costs as the production C4 basis. MS07e's 129 completed
cell commands summed to **1523.033 s**, but omit six cells and predate S3; neither
that total nor its early-stopped outcomes bounds the final matrix.

### Decision options — no implementation or ceiling change approved yet

- **A — retain all current 450/540 rules:** execute only cells with individually
  credible bounds after Q1 is settled; keep every other cell named/unexecuted.
  This authorizes **partial evidence only** where necessary, not full MS18c acceptance,
  final publication or release. The owner must understand that a complete route is
  not presently established; no hidden verdict is inferred from inability to run.
- **B — authorize Fable to specify a GQ-only longer bounded command route**
  (recommended if retaining the current qualifier): define numeric per-cell admission
  and process-tree ceilings from the complete preflight, with SA1 review **before**
  any over-540 execution. Keep the existing scheduler, seeds, request guard, jobs,
  p95 budgets and whole-cell records. Other gates keep 450/540. This preserves current
  qualification timing semantics better than silently restarting worker pools.
  No numerical higher ceiling is pre-authorized here; the chosen plan must state it.
- **C — if 540 must remain absolute and complete GQ is required:** authorize a
  **separate Fable-designed, SA1-reviewed bounded qualification route/tooling task**.
  It must settle checkpoint/worker lifecycle, cold/warm timing, early-stop/in-flight
  accounting, source identities and checked merging before collection. Do not claim
  that fresh-worker batching is already timing-equivalent or invent a `--from` route.
  No request-count, hit-rate or p95-budget relaxation is implied.

Q1 and Q2 are separate choices: accepting host-active timing does not permit a longer
command. Conversely, extending a watchdog does not approve the measurement environment.
An inserted tool/protocol task must be accepted and the dispatch base/brief updated
before MS18c resumes. The current no-new-tooling/no-early-credit rules remain in force
until an explicit recorded decision supersedes them.

**Vietnamese question for owner/Fable — Q2:**

> GQ hiện không resume được một ô; vòng 60 bổ sung chạy nối tiếp. Ví dụ 8 giây/lượt:
> (40/4 + 60) x 8 = 560 giây, vượt trần 540; sáu ô cũ chưa chạy có
> dự toán 556–4032 giây. Chọn **A** giữ trần, chấp nhận chỉ có dữ liệu một phần và
> chưa xuất bản; **B** giao Fable chốt trần lệnh riêng, hữu hạn cho GQ, SA1 duyệt
> trước khi chạy (giữ nguyên 120 giây/lượt, jobs=4 và ngưỡng p95); hay **C** giữ
> 540 nhưng cho phép task công cụ/protocol chia nhỏ có kiểm chứng trước GQ?

### Bounded execution plan after the decisions

1. Write/read back a **135-row preflight**, one row for every manifest cell, before
   the first GQ command. Record source-qualified observations, sample count, route,
   worker concurrency, bounds for each phase, overhead, margin, output paths and
   `admissible / unexecuted / unknown`; unknown is not zero. No new generation pilot
   is authorized merely to fill a planning gap.
2. With the current scheduler, use **P = H + 10 x B4 + 60 x B1** when expansion is
   possible: H covers loading/readiness/publication, B4/B1 are conservative bounds
   on one request **including post-generation validation** at the corresponding
   concurrency, with a stated variance margin. A generation-only GS mean/max is
   not B4/B1. Do not omit the serial round because a cell probably fails or passes
   round 1. Any approved alternative from Q2 must replace this formula explicitly.
3. Under unchanged rules admit only **P <=450 s**, one complete cell per invocation,
   with the **540 s limit covering launcher, qualifier and all workers**. Jobs 4 are
   the qualifier's own pool, not permission for four simultaneous qualifier commands.
   No compound matrix command, detached workers or parent-only timeout.
4. The **1–12 h** number is a historical total planning allowance, **not** a per-command
   limit or a verified completion promise. Sum the actual accepted P values and add
   inter-command gaps/admission waits; list unbounded cells separately. Even
   135 x 450 s is **16.875 h**, plus at least 134 x 15 s (**0.558 h**) in gaps.
   A credible full-matrix total is not available until the missing route/bounds are
   settled; do not fit projections to the 12 h label.
5. Run each admitted command attached and monitored. If a tool wait returns before
   completion, read the **same running process**, without rerunning or resetting its
   deadline. Waiting asynchronously does **not** extend 540 s. At that ceiling,
   the unchanged helper kills the owned process tree; retain logs and mark the cell
   failed/incomplete, not hidden. No automatic payload retry, partial-row stitching,
   shorter seed batch or larger guard follows. Report, continue only independently
   authorized safe work, and leave the publication gate unsatisfied for any gap.
6. If Q2-B/C is approved, implement only its explicitly assigned route first; still
   retain finite projections/deadlines, the same raw generation clocks and honest
   failure handling. Do not mistake the illustrative formula or the proposed option
   above for approval of a new ceiling. Audit **every outer wrapper/agent wait
   deadline** too: an inherited `spawnSync` timeout must not unexpectedly kill the
   approved child, and a longer tool wait must not silently bypass its watchdog.

## Inputs & context

R24, verbatim:

> MS18 first copies the existing v2 live table to `docs/difficulty-v3/qualification-v2.md`, preserving
> that historical record. It then updates `docs/difficulty-rating/qualification.md` in place with
> the final v3 table and updates the variant `difficultySupport` lists together.

Use Q's 15 variants x 9 levels, jobs 4, base 20260601, 40/100 seeds, exact+valid+solved+not-approximate
hits and original p95 budgets. No diagnostic overrides or --probe. MS07d merge rejects incomplete/
mixed records. Captured request errors/timeouts remain misses; worker/IPC loss is a failed run.
Only after complete validation derive offered arrays, preserving global level order and S-OD7.
Use r5p's **board-default attempts**, never an explicit eight-attempt qualifier override.

**Timed-run readiness:** use only the recorded Q1/Q2 disposition, after this brief is
amended to it. Until then no host-active GQ waiver, new qualification sharding, scheduler
change or altered jobs/40-100 protocol is authorized. Keep observations/waits separate
from raw request times. Plans precede phases, owned helpers are formatted before
freezing, and S-OD12/S0 plus the QUESTION pause remain binding.

**S-OD4 (c1), required for every offer:** at least 36 exact hits of 40 or 90 of 100 and p95 within
2/10/30 seconds for <=36/<=81/>81 cells. A bounded fallback, shallow result or timeout is a miss;
none keeps mega Nightmare/Hell or any other cell offered. A protocol-valid hidden verdict is
an accepted product outcome. Do not ask for a waiver before applying it, even for large grids.
Any proposal to retain an unqualified cell or raise a budget would change a recorded decision.
An invalid/non-unique puzzle, unsound proof or wrong exact flag/warning is a correctness stop,
not an availability miss that can be excused by hiding its cell.

**S-OD7 — Killer Hard/Expert stay hidden until later calibration.** The owner answered
Q-MS07e-1 on 2026-11-15 at 14:42 through `ask_user` and email: no Killer weight recalibration
inside v3. MS07e observed Hard 0/14 exact (p95 6.6 s) and Expert 1/14 (p95 17.8 s).
This is the recorded disposition of S-AV05/S-AV06, not another pending calibration question.
Keep both cells in the full final 135-cell protocol. Preserve the checked raw qualifier records,
including any later passing verdict; publish both levels as **hidden until later calibration
(S-OD7)** and record that owner withholding separately from qualification. If a raw cell qualifies,
do not falsify its raw `offered` verdict to make the product decision look like a qualification
failure, or re-offer it contrary to S-OD7. The live report distinguishes qualification from actual
offers; the latter match `difficultySupport`. No other cell receives this exclusion, no
unqualified cell is offered, and no interim publication or in-v3 weight change is authorized.

**Final-soak zero-exact observations:** MS18a classic9 Hell 1 was **0/12**, all shallow,
eight attempts each. Killer Hard/Expert were **0/12 at every MS18b cap** (the same
twelve keys per setting, not 48 independent seeds). Hidden qualification is expected
on these observations, not pre-assigned. Run all three cells under the complete final
protocol once admissible; retain exact/shallow/error/time counts and any valid early-stop
proof. Classic9 Hell 1 is offered **only if** its actual final qualification passes;
there is no separate owner veto for it. Killer Hard/Expert remain withheld under S-OD7
even if their raw GQ verdict passes. Report these distinct outcomes and every removal
to the owner; zeros or hidden verdicts alone need no new tuning/retention question.
An unexecuted cell is neither 0/N nor a hidden verdict.

**PR-S2 remark — expected outcome under the existing rule, not a new decision.**
Fable's answer (`92a7693`, `docs/difficulty-v3/clarifications-resolved.md`) confirms that cells
missing the exact-hit threshold or their p95 budget are not offered: 36 of 40 exact hits, or
90 of 100 where the existing protocol extends the cell, and p95 within the applicable budget.
On the present numbers, non-offering is likely for **mega16 Nightmare** and possible for the other
large-board Nightmare cells. This is an expectation, not a verdict assigned before final measurement:
use the complete final qualification, keep the 40/100 protocol and do not prune early or grant a waiver.
A hidden cell can be the honest v3 release outcome. The separately saved
`docs/improve-generating/plan.md` is not authorized now and is not a prerequisite for publication.

**IR17 — GD timing handoff (recovery source `00647f9`).** The classic9 GD Nightmare batch took
430.5 s, about 96% of the 450 s planning budget and 80% of the 540 s ceiling. Any rerun must
state a current-source projection with an explicit conservative margin for the whole command;
**449 s is not a reusable bound**. If no credible margin fits within 450 s, treat it as a
population above 450 s and follow the existing named unexecuted-item rule, without changing
counts or guards. Carry this warning and the current projection/margin to MS18e if Nightmare
remains offered. This does not add a GD run to MS18c or replace GQ's separate 40/100 protocol.

Reconcile all inherited availability items (including S-OD7's Killer disposition and large-grid
Nightmare/hell1) with final verdicts. A hidden verdict needs no calibration to be legitimate.
Route remaining cost findings to MS18d; include the complete item list for MS18e.

**Q-MS07e-2 / S-AV27 — six unexecuted cells, unchanged launch rule.** MS07e's section 4
left mega12/hell1 (556 s), mega16/nightmare (1,246 s), mega16/hell1 (1,808 s),
greaterThan/expert (919 s), greaterThan/hell1 (3,957 s) and butterfly/hell1 (4,032 s)
unexecuted; those are that source's projections, not measured qualification verdicts.
SA2 routed them here without reopening MS07e or requesting a rule amendment. Reassess
using authorized final-source evidence, including the first round at four workers, any possible
60-request **serial** second round, startup and variance margin. Launch only at a credible
<=450 s projection under the unchanged 540 s ceiling. Protocol-proved early stopping within
a run is still valid, but no early-stop credit, changed jobs, scheduler repair or new evidence/
tooling class is authorized for planning. Keep all six cells in the required final matrix.
If a complete bounded route remains unavailable, continue safe work and report an unsatisfied
publication gate; do not infer hidden verdicts, discard cells or publish a partial matrix.
That is the unchanged disposition, not a complete-execution plan. Q2 now brings the
final route decision to the owner/Fable **before** dispatch rather than leaving these
known gaps for a developer to rediscover.

### CV6-05 — the three fixed S-AV01 endings, before MS18d timing

The sign pool was measured and set aside; Greater-Than uses its restored first-allowed sign
pass. S-AV01 enters final work open at 5,209 ms against 1,400 ms on CV6's seeds and 10.6 s p95
on 7000-7039. These are historical cohorts, not qualification verdicts. Normal's CV6 base
remains 700 ms and GP rules stay unchanged until the specific decision below.

- If Normal fails final qualification, hide it by (c1), close S-AV01 as **"not offered"**, and
  record its CV6 case's treatment with the same hidden-cell manual population policy as every
  other cell. No Normal-specific exception, skipped assertion or diagnostic request loss.
- If Normal qualifies, obtain its **final-source CV6 result** before the MS18d handoff: retain
  compatible existing evidence or run only the unchanged Normal CV6 selector below. If it still
  fails, return the final-source numbers through the orchestrator to the plan author under
  CV6-05, before MS18d's final timing runs. Do not select a budget in this task.
  The decided contract's form is fixed: one base value in milliseconds for `BUDGET_MS.normal`,
  the same base for a Greater-Than Normal GP target if GP has one, factor application only
  through `SG.test.timeLimit`, and no base above **10,000 ms** (Expert/qualification budget).
  The test, corresponding GP target, `generator/design.md` section 9.1 (the `greaterThan` Normal
  cell) and both developer guides change in the same assigned contract step. Until the recorded
  decision, 700 ms stands; qualification does not make CV6 pass.
- If CV6 passes on the final source, close S-AV01 with that measurement, not an inferred waiver.

This conditional single-cell check does not move full GD from MS18e. Preserve raw old-contract
failures and source identities if a contract is subsequently changed; the final audit must not
relabel them as new-contract passes. If no bounded complete final-source CV6 record can be
obtained, keep the missing evidence/item explicit and resolve the contract handoff through the
orchestrator before final GP; continue independent publication/audit work, not an unsafe command.

S-AV16 and S-AV17 remain withdrawn as current-source pool regressions, with their observations
retained as history. Any later regression has its own originating task/source and named item.

### Publication and diagnostic compatibility

**Freeze and directory discipline.** Complete the assigned compatibility code/tests,
locale bytes and included-source formatting before qualification. Record the qualifier's
own source/tool/attempt-policy identities and the separate quick/E identities.
Keep only completed GQ cell JSONs in `evidence/MS18c/qualification/`; plans, readiness,
attempt logs, failed-run records and the merged JSON belong outside that merge-input
directory. A held admission is not a cell record. Do not overwrite or retag a failed/
completed attempt to obtain a new time.

The qualifier's --markdown writes a table BODY. Render to an evidence file, then compose the live
report with protocol, machine/Node/jobs/source, complete table and removals; do not erase its
explanatory metadata by blindly replacing it with the table body.
Record measured source identity and publication identity separately. Support-array-only changes
after measurement are documented: qualification already enables every level in its workers.
Any solver/algorithm change invalidates qualification, unlike that declared publication step.

Merge/validate the complete matrix **before** changing the support arrays. The merge
checks the current `engine.sources`; support-only publication changes that hash too.
Keep the pre-publication checked merge, raw shard hashes and source manifest, with
the exact support-array-only diff and sufficient preserved inputs/diff to independently
verify that identity. Do not change old hashes or bypass the merger's source check
after publication. A real generation/default/protocol change is not this exception.

**Exit 0 alone is insufficient:** at `14d8c903`, a structurally valid merge can return
0 while printing a CORRECTNESS warning when `totals.invalid > 0`. Require an explicit
**`totals.invalid === 0`**, inspect every request's validity/error status and all other
correctness conditions before publication. An invalid/non-unique puzzle is a stop,
not an ordinary hidden verdict or an error that withholding a level can excuse.
Captured generation errors/timeouts still count as misses under the unchanged protocol.

Archive the actual existing v2 live file byte-for-byte, with provenance/hash, before
replacement. It is the October v2 record (different recorded CPU/Node), not MS07e's
partial checkpoint or a newly composed v2 table. No archive exists at this base;
if one exists at dispatch, verify it rather than overwrite history.

Fixed regression/replay corpora remain all original keys/recipes. MS03a/d tooling temporarily
enables hidden requested levels. Apply the same diagnostic-only guard around the quick replay
loader's toConfig/pipeline call, restoring the original array in finally. This also covers
Generator `player.realResult`, `steps.result` and the S-OD8/MS07f manual `variants` replay helper: its fixed
mega16 Nightmare seed 478576959 and Hell 1 seed 2422420669 survive unchanged even if hidden,
as does the quick classic9 Hell 1 seed 3. Do not change requests/assertions, silently normalize
them to another offered level, skip them because of their tier or advertise hidden levels again.
`steps.result` includes Greater-Than Normal seed 4; if Normal is hidden, this remains
a fixed diagnostic request, not permission to normalize it to a different level.

Anchors verified at **`14d8c903`**: `qualify.js:132` (`parseArgs`), `:175`
(`sourceFiles`), `:208` (`child`), `:223` (`out.ms`), `:237` (DFS validation),
`:251` (`hitOf`), `:260` (`sourcesHash`), `:280` (`qualifierHash`), `:294`
(`attemptPolicy`), `:334` (`parent`), `:385` (`certain`), `:399` (`afterResult`),
`:460` (`next`), `:553` (`publish`), `:624` (`mergeShards`).
`fixtures/qualification-records.js:35` holds PROTOCOL, `:316` checks a cell and `:475`
merges the full matrix. Quick loaders remain `replay.entry:22`, `steps.golden:41`,
`steps.result:17`, Generator `player.goldenResult:29` and `player.realResult:19`; the manual fixed
`variants` replay helper is at `:793`, with the two seeds at `:849`.
`store.closestSupportedLevel:186`, `normalize:209`, `load:728`, app `store.load:1193`
before `controls.mount:1233`, and the controls subscription at `:927` establish the
startup problem. Explicit pipeline refusal is `pipeline.js:67`. Locate by symbol
if an authorized earlier task changes lines; do not reuse the pause-era anchors.

At HEAD `store.load` normalizes with no adjustments and announces `adjustments:[]`; app startup
loads before constructing controls. Do not assume the existing nearest-level calculation already
shows a **stored-request** correction note. Own the focused end-to-end correction if r5p has not
supplied it: a stored hidden level becomes the nearest offered one (easier on ties), with the
existing EN/VI note visible on initial render. Preserve explicit/default attempt intent and URL
priority. Hidden explicit pipeline requests must still throw; existing Player puzzles still open.

Keep `store.load()`'s state-return contract and persistence/URL priority; transport
load-time adjustments transiently to the initial controls render rather than emitting
an event before the controls subscribe and then losing it. Do not persist a stale
notification or expose a note for ignored stored settings overridden by a valid URL.
Exercise actual app/startup/control initialization with controlled hidden offers,
both locales and the default/explicit attempt cases, not only a normalizer unit call.

### Source-aware evidence and quick closure

This task owns changed application/variant inputs, unlike MS18a/b. After final
publication/source formatting, compute actual E identities. Store/UI edits and support
arrays can change replay/hash identities even when outputs should be identical.
Use section 7's existing bounded E route: fresh **5 wires -> 14 analyses -> 520 hashes**
for changed identities, complete merge-checks, then all-40 GH check-only. These are
the original fixed diagnostic requests, with hidden-level access only inside restored
guards. No fixture/hash/help rewrite is pre-authorized; an unexpected output change
needs explanation and QUESTION before any write. Do not retain/retag an old-identity
ledger merely because an unchanged output was expected.

Finish fingerprinted guides/counts/tests before both complete bounded quick sets;
maintain CI projections by the existing rule, save final metadata before the final
CI check, and verify final fingerprints. Keep source-qualified deep/manual replay
evidence and reconcile its original requests; no blind expensive duplicate if already
compatible. Full final GD/other deep ownership remains MS18e. If a necessary support/
test population compatibility step cannot be completed here, assign it explicitly
before declaring publication accepted, not as a hidden release debt.

## Inherited and new item handoff

Carry the full check-list register and MS18a/MS18b item tables, with each source and
population distinct. The final reply and MS18e handoff include:

| Item | Disposition / owner |
|---|---|
| MS18a-Q1-HOST, MS18a-Q2-ADMISSION | Original failed strict screen/attribution limits and two service holds resolved at attempt 2, no gap/rerun. Q1 here decides final measurement use; retain history for MS18e. |
| **MS18b-HOST-ACTIVE** | 44 commands, strict failed 40/passed 4, zero holds/re-asks/gaps, incomplete attribution. No existing GQ/GP waiver; Q1 and MS18e audit. |
| **MS18b-R5-C result** | 256/C4 reconfirmed on 360 outcomes, no owner action. Preserve 1215 -> 1104 witness and 36 -> 20 C comparison; no joint-default experiment or retune. |
| MS18b Killer zero-exact observations | Hard/Expert 0/12 at each of four caps, same keys not 48 independent seeds; S-AV05/06 and S-OD7 apply. This task measures both and separately withholds them. |
| MS18b measured R5/C costs | Six-cell generation 371.4/388.6/410.9/423.1 s at 64/128/256/none; C6 526.1 vs C4 139.3 s (3.8x). Descriptive GS, not GQ/GP or an admission bound; MS18d/e. |
| S-AV25 / MS18a classic9 Hell 1 | Current default 0/12 shallow, old MS02 12/12 vacuous. Expected hidden, but final raw GQ decides; no premature verdict. |
| S-AV14, S-AV15 and MS17b GD gaps | Normal 83/100 failed; Hell 1's 8 tests/20-request batch and confusion's 1 test unexecuted at stated 919/1544 s bounds. GQ does not replace GD; MS18e keeps them. |
| MS17b-GD21-PROCESS; MS15b-Q6; MS16-Q6 | Preserve unlocked diagnostic/bisect defects, controlled placement coverage and fixed seed-377 lineage/pause disclosure; MS18e audit. |
| S-AV01 / CV6-05 | Follow the three conditional endings above before GP. No decision on a new Normal budget is made now. |
| Q-MS07e-2 / S-AV27 | Six older unexecuted cells; one-worker second round and mixed-concurrency timing. Q2 here resolves the route, not their availability. |
| S-AV28-S-AV30, MS18a `greaterThan:expert:0`, S-AV18-S-AV23 | Prior source/sample-specific availability/target effects; reconcile with final verdicts, retain historical losses, do not generalize a 12-request cohort. |
| S-AV36-S-AV39, S-AV31/S-AV33/S-AV34 | Construction/seeded/synthetic/repository/whole-generation populations and frozen finder limits remain separate. This task supplies availability, MS18d costs, MS18e audit. |
| MS15b-GP-J / MS15b-GP-U; S-AV38 | ALS 37-cell record: one full, one pilot-only, 35 unmeasured; distinct from grouped 50-cell incomplete GP. Final GP remains MS18d. |
| **MS18c-Q1 / MS18c-Q2** | Open readiness/execution decisions recorded above; no developer default or waiver. Retain the answer, resulting contract and any unexecuted cells in the final audit. |

Standing quick cost, earlier resolved decisions and withdrawn S-AV16/S-AV17 findings
retain their recorded dispositions. Name new actual offer losses, time misses or
unexecuted populations; a named item never substitutes for complete publication.

## Files to create/modify

- Evidence/MS18c and final qualification JSON under docs/difficulty-v3.
- Task-owned read-only planning, admitted-launch, validation/reporting and existing
  bounded-E helpers under `generator/tests/artifacts/difficulty-v3/MS18c/`, only after
  the decisions are recorded. Do not copy MS18b's cap/window attempt key for GQ:
  use variant/level and the frozen qualifier/source/protocol/jobs/seed/attempt-policy
  identity, with separate attempts only before any payload start.
- New `docs/difficulty-v3/qualification-v2.md`; live qualification.md; notes with every removed level.
- Only `difficultySupport` arrays in `generator/js/variants/*.js`.
- `generator/js/ui/store.js`, `controls.js` and app startup only as needed for the stored-request
  correction note; existing EN/VI keys or both languages if a new message is necessary. No generation policy.
- All three fixed golden quick loaders/helpers, Generator `player.realResult`, `steps.result` and the
  MS07f fixed replay helper in `generator/tests/manual/variants.test.js`, with focused restoration
  tests. Only hidden-level diagnostic compatibility; S-OD8's requests/assertions/tier stay intact.
  Enumerate directly affected quick/manual offer assertions/populations before editing; preserve original
  diagnostic requests and public refusal coverage. Existing reader path remains.
- Generator design 5.1/15.4 and both user/developer guides in EN/VI: actual availability,
  qualifications versus S-OD7 withholding, relevant behavior and current test counts.
- Fresh E records and check-only GH/quick/CI evidence as above; no canonical expectation
  write or permanent qualifier/scheduler/protocol edit without its explicit decision/task.
- Only if CV6-05's conditional final decision is actually needed and recorded: an orchestrator-assigned
  contract step owns Normal's `BUDGET_MS` in `generator/tests/manual/greater-than.test.js`,
  the matching Greater-Than Normal target in `generator/tests/fixtures/perf-helper.js` if present,
  `generator/design.md` section 9.1 (the `greaterThan` Normal cell) and both developer guides
  together. No value is authorized in advance; no seed/count/other-budget edit.

## Implementation steps

0. **Do not begin full dispatch until Q1/Q2 are answered and the approved contract is
   incorporated.** Any prerequisite implementation/tooling task is separately accepted.
   Then read back plans for each phase, confirm identities/slot, and format before freezes.
1. Finish the narrowly coupled compatibility logic/tests on controlled hidden-level fixtures, without
   pruning live offers. Then freeze candidate/defaults and archive v2 before any live-table change.
2. Preflight every intended cell, collect all 135 complete cells under the approved
   bounded route, merge/check before support publication, and require zero invalid puzzles.
   Distinguish protocol-proved hidden verdicts from failures, holds and unexecuted cells.
3. Update live report and exact matching product support arrays together; record every
   addition/removal and S-OD7's separate Killer withholding without altering the raw GQ verdicts.
   Audit MS05b3's manual level/selector population against those offers now. Some variant suites
   have fixed `LEVELS` arrays; requesting a newly hidden level through the normal pipeline throws
   `difficulty.unsupportedLevel`. Identify any such test/publication compatibility work before
   claiming publication accepted and assign a bounded follow-up through the orchestrator.
   Do not leave MS18e to discover it, silently drop a selector, enable hidden production requests,
   compact surviving seed indexes, or present a zero-test result as passed. This audit does not
   authorize weakening an I5/hit threshold; record the explicit qualification-driven population
   disposition and keep the independent fixed GG/GR diagnostic populations unchanged.
4. Preserve fixed diagnostic recipes after hiding levels and restore arrays even on failure.
   Verify all three golden consumers, mega deep requests, every affected fixed quick request
   and MS07f's two fixed manual mega16 replays. Their original requests/assertions remain.
   Keep diagnostic generation separate from public unsupported-level refusal; no lost request
   or reindexed manual seed is disguised as a qualification-driven test update.
   Verify stored hidden-request nearest-level selection and its visible initial note in both languages.
5. Verify publication-only engine diff and resolve S-AV01 by the three CV6-05 endings above.
   Hand MS18d the offered/performance manifest, final-source CV6 evidence and any recorded
   same-step Normal contract change before its final timing runs.
6. Complete source-aware E/GH, both final quick sets, final CI metadata/check and the
   complete item/owner-decision record. SA1 reviews before orchestrator acceptance.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18c-B01 | Only genuinely qualified levels are offered; losses are reported to the owner |
| MS18c-B02 | V2 history/read paths and fixed evidence requests are preserved |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18c-T01 | Complete 135-cell/jobs 4 protocol, exact source/defaults and checked merge |
| MS18c-T02 | Live product offers equal support lists and withhold Killer Hard/Expert under S-OD7; raw qualification verdicts and v2 archive unchanged; no algorithm/weight tuning |
| MS18c-T03 | Hidden-level diagnostics restore arrays, recipes unchanged, both quick sets pass |
| MS18c-T04 | (c1) covers every board/level, fallbacks miss, S-OD7 and all six Q-MS07e-2 cells are accounted for, stored hidden requests show the note, Player imports remain compatible, all items reconcile, and S-AV01's CV6-05 disposition precedes MS18d timing |
| MS18c-T05 | Q1/Q2 approved before execution; full per-cell preflight and immutable admission/run records; no unsupported resume, false hidden verdict or timeout reset |
| MS18c-T06 | Pre-publication checked merge has zero invalid puzzles; source/publication compatibility proved; final source-aware E/GH/quick/CI closure and SA1 review complete |

## Test plan and gates

Generator payload examples, **not launch authorization**: only after Q1/Q2 disposition
and a credible admitted whole-cell plan, then every Q cell:

```powershell
node tests\qualify.js --variant=classic4 --level=veryEasy --jobs=4 --json=..\docs\difficulty-v3\evidence\MS18c\qualification\classic4-veryEasy.json --markdown=..\docs\difficulty-v3\evidence\MS18c\qualification\classic4-veryEasy.md
node tests\qualify.js --merge=..\docs\difficulty-v3\evidence\MS18c\qualification --jobs=4 --json=..\docs\difficulty-v3\qualification-v3.json --markdown=..\docs\difficulty-v3\evidence\MS18c\table.md
```

**Conditional Normal CV6 only (CV6-05):** if Normal qualifies and no compatible final-source
record exists, preflight the exact selector with `--list-tests` (selected total 1), then use
the current-source projection and existing lock/450 s planning/540 s ceiling rules:

```powershell
Invoke-Dv3Node -Task MS18c -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=greater-than','--filter=> normal: 20 puzzles > CV6:','--verbose','--results=..\docs\difficulty-v3\evidence\MS18c\cv6\normal-results.json')
```

Keep all 20 requests and original seeds; `-AllowExit1` records the expected timing failure,
not acceptance. No whole Greater-Than corpus or other CV6/I5 selector is added here.
Hand this record and its identity to MS18e for coverage reconciliation; any later changed
contract/fingerprint requires the normal compatibility/replacement handling.

GQ jobs 4; the bounded-plan section above governs projections and actual waits.
The current <=450 s admission/540 s process-tree ceiling remains unless a recorded
Q2 decision explicitly replaces it for an assigned GQ route. The historical 1-12 h
allowance does not establish a full-matrix bound or extend any command's deadline.
Announce/read back the plan, obtain the slot and record the approved Q1 condition.
A slow cell without an approved bounded route is a named
availability item; continue safe cells and independent audit work, never invent a hidden verdict
or a new tooling class. **Do not publish an incomplete matrix.** The final record must say if
publication remains unready; changing the qualification/publication rule requires the owner.
Generator candidate selectors: `--suite=variants-registry,store,controls,smoke,replay,steps,player,help,ui-contract,qualification-records`;
both quick sets. Test restoration after diagnostic failure and unchanged request identity for a
temporarily hidden G04 request. Final full GD is MS18e; no hash rewrite just to hide a support error.
Run the stored-load notification through actual startup/control initialization, not only
`sanitizeWithNotes`. Preserve r5p's explicit 8 and default-mode migration behavior.

## Definition of done & handoff

Give MS18d/e full qualification/provenance, offered lists, v2 archive, compatibility evidence and
the cumulative numerical item list, including S-AV01's fixed ending and any decided Normal
contract update completed before GP. Include S-OD7's two withheld cells and the disposition
of each Q-MS07e-2 cell; an unexecuted cell is not a hidden verdict. Hand off the unchanged
MS07f manual replay selectors and any diagnostic compatibility proof for MS18e's final checks.
A correctly hidden large-board cell is a valid result, not a blocker.
If any variant has no offered level and current UI/registry cannot represent that, report a blocker
for an assigned compatibility fix; never invent a qualified level.

## Resume rules — S-OD4

Review: SA1 cross-review. Correctness/evidence corruption or changing a recorded decision
stops; time/availability is a named numerical item, not an owner stop or offer waiver.
Q1/Q2 are explicit pre-dispatch decisions, not implicit performance exceptions.
Until a recorded replacement is approved, use `Invoke-Dv3Node` for every possibly
>10-second payload, <=540 s; preserve GQ jobs 4 and the current bounded quick manifest.
Any authorized new suite owns its r6c CI group/manifest entry.
No new slow-cell evidence/tooling class is authorized by this prepared brief.
Return all item dispositions to MS18d/MS18e and never
publish an incomplete or unqualified offer as though (c1) passed.

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
