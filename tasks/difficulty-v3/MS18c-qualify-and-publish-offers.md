# MS18c — Final qualification and live offered levels

| Header | Value |
|---|---|
| Depends on | MS18b accepted; S-OD13 recorded; Stage 1 preflight, then joint SA1/SA2 numeric approval before Stage 3 |
| Accepted base | `14d8c903` (MS18b); runtime candidate remains `57c1b10`, R5 256 / C4 reconfirmed |
| Size / active time | Medium; 35-50 minutes plus GQ |
| Owner / milestone | Qualification/publication; M18c |
| Authority / review | R24/R21, AUTH-S1, SA1-Q-S5, S-OD4 (c1), S-OD7/S-OD8/S-OD13, CV6-05; joint ceiling approval and SA1 cross-review |
| Status | Stage 1 FILE-ONLY preparation ready; SA2 ceiling proposal P1 awaits SA1; no GQ before joint Stage 2 approval |

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
| **MS18c-Q1: final qualification measurement environment** | **Resolved by S-OD13: A.** Declared host-active GQ; actual raw p95 and the full qualification contract remain binding. |
| **MS18c-Q2: complete qualification execution route** | **Resolved by S-OD13: B, with numeric authority delegated jointly to SA1/Opus and SA2/Astra, not Fable.** Per-cell ceilings are not yet approved; Stage 1 must stop for Stage 2. |
| CV6-05 Greater-Than Normal fallback contract | **Conditional later, not an unconditional start dependency.** Only if final Normal qualifies and its final-source CV6 still fails: return numbers to Fable under the already recorded delegation, before MS18d. No budget value selected now. |
| A variant with no qualified/offered level, unexpected publication incompatibility | **Conditional blocker if observed.** No invented passing level or silent population change. Assign the compatibility decision/fix through the orchestrator. |

Thus no R5/C or Q1/Q2 owner choice remains open. **Numerical authority is delegated,
not exercised yet**: the developer cannot choose a ceiling. Dispatch Stage 1 only;
its completion is a hard stop, not permission for GQ or production edits.
SA1 and SA2 must jointly approve the source-bound per-cell plan before Stage 3;
SA1 also retains the normal final code/evidence/publication cross-review.

**S-OD13 — owner, Discord author `amicably8850`, 2026-11-18 21:31:46 (+07:00):**

> Q1: A. Q2: chọn phương án B nhưng giao SA-Opus và SA-Astra chọn mức trần, không cần thông qua Fable.

The verbatim answer and prepared questions are archived in
`docs/difficulty-v3/clarifications-resolved.md`, S-OD13. **SA-Opus = SA1; SA-Astra =
SA2. No Fable approval is required for these ceilings.** CV6-05's separate conditional
Normal-budget delegation to Fable is unaffected.

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

## MS18c-Q1 — uniform GQ readiness: S-OD13 selects A

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
S-OD13 now explicitly approves the declared condition; this is not silent inheritance
of MS18b's descriptive-only exception. Waiting asynchronously does not remove the host.

**Binding GQ policy identity: `MS18c-GQ-host-active`.** At Stage 3:

- Obtain the explicit shared slot. Verify the named host instance, own mutex and
  absence of a foreign timing lock before sampling and immediately before the payload.
  Keep the raw five one-second CPU intervals and original mean <=0.5 / max <=1.0
  strict-screen result as `ready`, separately from named-policy `admitted`.
- Keep the **>=0.5 CPU-s per elapsed second** additional-consumer hold and the
  verified per-instance process observations. No OS-service, all-`copilot` or host-tree
  exemption. Known foreign heavy work still blocks; missing required counters or
  identity is not idle. Ordinary identified launcher/sampler work is instrumentation.
- One >=60 s fresh-slot re-ask is permitted only for a verified **unstarted** eligible
  additional-consumer hold: at most two attempts per fixed GQ cell/configuration
  across restarts, distinct immutable attempt records, no quota reset or payload
  rerun. A second eligible hold stays an unexecuted gap while other approved cells
  may continue. Unknown/mixed reasons, identity/evidence defects or a purported hold
  after payload start retain their existing stop rules.
- **Actual raw generation p95 is binding:** 2/10/30 s budgets, jobs 4, 40/100 seeds,
  the 120000 ms generation guard and hit predicates are unchanged. No CPU subtraction,
  normalization, budget relaxation, miss waiver or faster-repeat selection. Record
  the declared host-active environment on every cell. These times decide offers;
  they are not merely descriptive GS timings or strict-quiet measurements.

The same declared environment supplies the previously specified conditional CV6
readiness in this task, with its original assertion and ordinary **450/540** command
limits. The **GQ-only longer watchdog may not be used for CV6**. No GP timing or
command-limit waiver follows; MS18d retains its own contract.

## MS18c-Q2 — S-OD13 selects B; ceilings require joint SA1/SA2 approval

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

### Chosen route and authority

The owner selected **B**, retaining the current whole-cell qualifier and scheduler.
**SA1/Opus and SA2/Astra jointly choose the per-cell admission and process-tree
ceilings. Fable is not an approver for this route.** Options A/C were not selected.
There is no permission to change seeds, jobs, the serial-round behavior, request
guard, p95 budgets, hit predicates or the complete 135-cell publication rule.

S-OD13 authorizes the exceptional **GQ-only** route, not a particular number.
The proposal P1 below is **SA2's proposal for SA1 review**, not joint approval and
not a developer launch setting. Other gates remain at 450/540, including CV6, E,
GH, GD, GP and quick tests.

### Ceiling proposal P1 — concrete envelope, awaiting SA1

All quantities below are **seconds**, not request budgets.

1. Retain the scheduler-aware model **P_i = H_i + 10 x B4_i + 60 x B1_i** for every
   cell: full first round plus possible full serial second round, no early-stop credit.
   B4/B1 cover a worker's complete request turnaround, **including post-generation
   validation and reply/IPC**, at the corresponding concurrency. Use **H = 60 s**
   for candidate startup/readiness/publication overhead; if the evidence cannot
   support that allowance, flag it for the analysts rather than lower it to fit.
2. Where compatible whole-turnaround observations exist, candidate
   **B_j = ceil(1.5 x observed maximum_j)**, never a mean or p95. Record sample/source/
   route/guard/concurrency and why the observation applies. With only generation
   times, report those maxima separately: **no automatic zero validation allowance**.
   A candidate `ceil(1.5 x generationMax_j + V_j)` needs an explicitly justified
   conservative post-generation bound V_j approved by both analysts.
3. If jobs-4 evidence is absent but a valid whole-request B1 is available, expose
   **4 x B1** only as a labelled contention-proxy candidate, not a jobs-4 measurement
   or automatically approved bound. A guard-based alternative likewise needs an
   explicit overshoot allowance D_j and validation/reply bound V_j:
   **B_j = 120 + D_j + V_j**. The cooperative generation guard alone bounds neither
   its overshoot nor the unguarded post-generation work. Neither 120 nor 130 is a
   universal substitute for missing observations; do not clamp a larger estimate to 120.
4. Define **R30(x) = 30 x ceil(x / 30)**. Candidate admission bound
   **A_i = R30(P_i)**. If **A_i <=450**, retain **T_i = 540**. If
   **450 < A_i <=9600**, propose **T_i = R30(1.25 x A_i)**: a 25% watchdog reserve
   beyond the already margin-bearing admission bound. Proposed absolute envelope:
   **A_i <=9600 s (160 min), T_i <=12000 s (200 min)**, GQ only.
5. Unknown/non-finite/non-positive/unsupported bounds or **A_i >9600** are **unadmitted**, not
   clamped, assigned the envelope maximum, or marked hidden. They remain in the
   135-row plan with explicit gaps. A changed envelope or exceptional per-cell
   derivation needs a new joint SA1/SA2 decision before execution; never a developer
   adjustment after a slow result.

The envelope is deliberately large enough to consider a full guard-scale 100-request
cell without pretending that 540 s covers it. It is not a forecast that every cell
needs hours, proof that all cells fit, or a product/request-budget increase.
Illustrative arithmetic only, **not approved cells or assumptions**:

| H | B4 | B1 | P | Rounded admission A | Process-tree T |
|---:|---:|---:|---:|---:|---:|
| 60 | 4 | 2 | 220 | 240 | 540 |
| 60 | 8 | 8 | 620 | 630 | 810 |
| 60 | 40 | 40 | 2860 | 2880 | 3600 |
| 60 | 130 | 130 | 9160 | 9180 | 11490 |

The 130 s row illustrates why this envelope was proposed; **it does not assert a
ten-second overshoot/validation bound**. Stage 1 must expose missing evidence, and
Stage 2 must justify the actual numbers. Approving this general formula alone would
still not approve any of the 135 cells.

### Three-stage flow and mandatory stops

**Stage 1 — FILE-ONLY developer preflight, then stop.**

- Allowed now: read the accepted records/code, compute source/tool/attempt-policy
  identities, inspect static Node/machine metadata, create a task-owned read-only
  planner and fake-data tests, and produce **exactly 135 rows** under
  `docs/difficulty-v3/evidence/MS18c/preflight/` (`gq-cells.json`, `gq-cells.md` and
  input/hash/outer-deadline audit records). Helpers belong only in this task's
  `generator/tests/artifacts/difficulty-v3/MS18c/` directory.
- **No puzzle generation, GQ/probe/pilot, live admission samples/no-op campaign,
  production/compatibility/test-suite/qualifier edit, archive/publication or long-run
  helper implementation.** Loading declarations for metadata is not permission to
  call a generator, solver or uniqueness checker. Stage 1 uses ordinary 450/540
  protection if a metadata command's cost is unknown or possibly above ten seconds.
- Each row records key/board/default attempts/budget, jobs 4, seed base 20260601,
  40+60 protocol, every evidence path/hash/sample count/source/configuration/clock,
  compatible versus merely indicative observations, candidate H/B4/B1/P/A/T,
  assumptions, missing data and `candidate / unknown / outside proposed envelope`.
  Candidate numbers are **not approvals**; keep unknowns null with reasons.
  Do not use C6/other-cap data as a default-C4/256 measurement or another board as
  an unexplained proxy. Retain generation-only clocks as generation-only.
- Fake-data checks cover rounding/boundaries, unknown/invalid inputs remaining
  unadmitted, generation-only data lacking V, correct 135-key coverage and no
  `approved:true` status generated by the planner. They run no solver or payload.
- Audit the complete deadline chain described below, report the sum of supported
  candidate P values and waits separately, list unresolved cells, format/hash the
  outputs and helper bytes, and **return to the orchestrator and STOP**.
  Do not continue into compatibility work or GQ because all candidate numbers happen
  to fit. No new generation is allowed to fill an unknown.

**Stage 2 — SA2 + SA1 joint decision, not a developer phase.**

- Both analysts review the exact preflight hash/source/machine/defaults and the
  proposed rule. They resolve or reject each H/B4/B1 derivation and explicitly
  approve **P_i, A_i and T_i per cell**, or mark that cell unadmitted. No response,
  general formula agreement or one analyst's acceptance is not joint cell approval.
- Record both approvals and rationale; the pack author/orchestrator publishes an
  immutable source-bound manifest, for example
  `tasks/difficulty-v3/MS18c-gq-approved-ceilings.json`, in a pack commit. It lists
  all 135 cells, approved/unadmitted status, exact input hashes/machine/Node/policy,
  numeric bounds, outer budgets and the real approval references. **That file does
  not exist or confer authority merely because its name appears here.**
- Unknown/unbounded cells require an explicit analyst disposition. Safe approved
  cells may be authorized while others stay unadmitted, but full publication remains
  blocked by any missing cell. No hidden verdict, extra probe or tooling/protocol
  change follows from an unadmitted row. Fable is not required for these ceilings.
- The orchestrator relays **both** approval and the explicit Stage 3/slot release.
  The developer never writes its own approval, changes the committed limits or
  chooses a ceiling from P1's examples.

**Stage 3 — implement the approved supervision/compatibility, then GQ.**

- Only after the Stage 2 relay may the original implementation steps below begin.
  Preserve the shared `Invoke-Dv3Node` for non-GQ work. A task-owned
  **GQ-specific** supervisor reads the committed approved cell record, verifies its
  identity and builds only that cell's unchanged `qualify.js --jobs=4` payload.
  No free-form timeout override or use for CV6/quick/E/GP.
- Before any real GQ, test approval lookup/rejection, units, deadline arithmetic,
  admission holds and owned process-tree cleanup using fake clocks/short-lived
  stand-ins, not long generation trials. Format/freeze helpers. Recheck all bound
  inputs after compatibility edits: an engine/tool/attempt-policy/default/Node/
  machine change needs a Stage 2 compatibility/reapproval record before GQ. Unrelated
  UI/test/doc edits outside those inputs do not invalidate GQ-bound approval; their
  separate E/quick identity and verification obligations still apply.
- Run **one complete cell per attached supervised invocation**, no compound matrix,
  detached workers, seed splitting or deadline reset. T_i starts when the owned Node
  launcher starts after lock acquisition and covers readiness, qualifier and workers.
  Keep the >=15 s gaps and approved Q1 admission behavior. Wait/read the same process;
  a returned tool wait is not a fresh command.
- At T_i, terminate the **owned process tree**, retain logs/output and report a
  failed/incomplete cell, never a hidden verdict. No automatic payload retry or
  higher timeout. If a completed invocation exceeds approved A_i, retain the result
  but return to Stage 2 before further GQ launches; finish only independent offline
  work meanwhile. A valid p95 miss **within** the command bound is an ordinary hidden
  result and does not trigger a new ceiling question.
- At any unresolved gap the full publication gate remains unsatisfied. The 1-12 h
  figure is still historical planning context, not a promised total or per-command
  timeout: sum the actual approved projections plus gaps/waits and report unknowns.

### Outer waits and `spawnSync` audit — part of Stage 2 approval

The accepted MS18b `drive.cjs` uses **`spawnSync(... timeout: 1800000)`** (1800 s).
It cannot be copied unchanged for a longer approved cell. The existing wrapper can
also wait up to **1200 s** for a foreign lock and then up to **1200 s** in the shared
helper for acquisition: do not budget only one wait if both are retained.

P1 proposes an outer per-attempt envelope **O_i = T_i + 2400 + 300 seconds**:
up to two 20-minute acquisition waits plus 300 s for release settling, ordinary/re-ask
spacing, wrapper startup, output and cleanup. At proposed maximum T=12000,
**O=14700 s (4 h 5 min)**. This is **not** permission to hold the timing lock before
launch for that duration or to run the qualifier past T_i. Audit all actual wait paths;
if they need more than this allowance, Stage 2 must settle them first.

Prefer one directly supervised PowerShell invocation per cell, without a redundant
`spawnSync` matrix wrapper. If retained, every outer process/agent transport deadline
that can kill the invocation must be >= its approved O_i, or absent with the finite
inner watchdog and reliable owned-tree cleanup still in force. A `spawnSync` timeout
that kills only its immediate PowerShell child is not sufficient cleanup.

The orchestrator must confirm that the owning agent/tool can remain attached and be
monitored for that envelope before releasing a long cell; unavailable/unknown runtime
support is a blocker, not a reason to detach workers. Tool **initial waits** may be
600 s followed by reads of the same shell ID: they are response windows, not the
process-tree limit and not permission to restart the clock. Record actual acquisition,
readiness, payload and overall durations separately. A wrapper deadline defect returns
to the analysts; it never becomes a puzzle miss or a silent retry.

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

**Timed-run readiness:** S-OD13 approves `MS18c-GQ-host-active`; numeric execution still
requires the exact Stage 2 joint approval. No new qualification sharding, scheduler
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

**Q-MS07e-2 / S-AV27 — six historically unexecuted cells.** MS07e's section 4
left mega12/hell1 (556 s), mega16/nightmare (1,246 s), mega16/hell1 (1,808 s),
greaterThan/expert (919 s), greaterThan/hell1 (3,957 s) and butterfly/hell1 (4,032 s)
unexecuted; those are that source's projections, not measured qualification verdicts.
SA2 routed them here without reopening MS07e or requesting a rule amendment. Reassess
using authorized final-source evidence, including the first round at four workers, any possible
60-request **serial** second round, startup and variance margin. **S-OD13 now permits
the GQ-only joint-approved A_i/T_i route** in place of the old 450/540 limit for those
cells actually approved at Stage 2. Until that approval, no GQ launch is permitted.
Protocol-proved early stopping within a run is still valid, but no advance early-stop
credit, changed jobs, scheduler repair or new evidence class is authorized.
Keep all six cells in the required final matrix.
If a complete bounded route remains unavailable, continue safe work and report an unsatisfied
publication gate; do not infer hidden verdicts, discard cells or publish a partial matrix.
The owner's route decision is recorded; **SA1 and SA2**, not Fable or the developer,
must settle each numeric bound before launch. The complete-publication requirement
and honest-gap disposition are unchanged.

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
| MS18a-Q1-HOST, MS18a-Q2-ADMISSION | Original failed strict screen/attribution limits and two service holds resolved at attempt 2, no gap/rerun. S-OD13 explicitly approves final GQ use of the declared environment; retain history for MS18e. |
| **MS18b-HOST-ACTIVE** | 44 commands, strict failed 40/passed 4, zero holds/re-asks/gaps, incomplete attribution. Its original GS exception did not transfer automatically; S-OD13 now authorizes GQ, not a GP waiver. MS18e audit. |
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
| **MS18c-Q1 / MS18c-Q2 / S-OD13** | Owner selects A/B and delegates numeric ceilings jointly to SA1/SA2. Stage 1 preflight and Stage 2 per-cell approval remain; P1 is a proposal, no developer default. Retain approvals, bound misses and unexecuted cells for MS18e. |

Standing quick cost, earlier resolved decisions and withdrawn S-AV16/S-AV17 findings
retain their recorded dispositions. Name new actual offer losses, time misses or
unexecuted populations; a named item never substitutes for complete publication.

## Files to create/modify

- Evidence/MS18c and final qualification JSON under docs/difficulty-v3.
- **Stage 1 only:** the file-only preflight/planner/tests and its outputs at the paths
  above; no source, live runner, qualification or publication changes.
- **Stage 3 after joint approval:** task-owned admitted-launch, validation/reporting
  and existing bounded-E helpers under `generator/tests/artifacts/difficulty-v3/MS18c/`.
  Do not copy MS18b's cap/window attempt key for GQ:
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

0. **Stage 1 is file-only and ends at the mandatory stop. Stage 2 belongs jointly to
   SA1/SA2. Only explicit Stage 3 release permits steps 1-6 below.** The owner policy
   is already recorded; no numerical ceiling is chosen by the developer. Read back
   each phase plan, confirm approved inputs/slot and format before freezes.
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
| MS18c-T05 | S-OD13 enforced; Stage 1 stops; exact per-cell A/T/source plan jointly approved by SA1/SA2 before Stage 3; immutable records and audited outer deadlines |
| MS18c-T06 | Pre-publication checked merge has zero invalid puzzles; source/publication compatibility proved; final source-aware E/GH/quick/CI closure and SA1 review complete |

## Test plan and gates

Generator payload examples, **not launch authorization**: only after Stage 2 joint
cell approval, tested Stage 3 supervision and explicit release, then each approved Q cell:

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

GQ jobs 4; the staged plan above governs projections, approvals and actual waits.
GQ uses **only its committed, jointly approved A_i/T_i**, never P1's candidate numbers
or a developer-selected fallback. Non-GQ work retains 450/540. The historical 1-12 h
allowance does not establish a full-matrix bound or extend any deadline.
Announce/read back the approved plan, obtain the slot and record the S-OD13 condition.
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
S-OD13 resolves Q1/Q2 policy; Stage 2 numeric approval is still an explicit stop,
not an implicit performance exception. No GQ before both analysts approve the exact
cell plan and the orchestrator releases Stage 3. Use the approved GQ-only supervisor
for those cells; all other possibly >10-second work uses `Invoke-Dv3Node`, <=540 s.
Preserve GQ jobs 4 and the current bounded quick manifest.
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
