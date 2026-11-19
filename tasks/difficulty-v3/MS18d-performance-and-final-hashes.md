# MS18d — Final performance matrix and full hash check

| Header | Value |
|---|---|
| Depends on | MS18c accepted at `e0596801`; acceptance recorded by `34ebc3fc`; S-OD15 A recorded; reviewed C0/C0b/C1 tooling and per-chunk admission before timing |
| Accepted base | MS18c `e0596801`; acceptance `34ebc3fc`; Phase A `602af371`; Phase B `50903182` / `b3144fcf`; C0/C0b `56b97b26`; combined C1 `e62d0931`, pre-B `27128684` |
| Size / active time | Medium; 40-55 minutes including preflight tooling, plus GP/GG |
| Owner / milestone | Performance evidence; M18d |
| Authority | R24/R21, FS23, S-OD4, S-OD15 A; S-AV01 not offered; S-OD13 remains GQ-only |
| Status | C2 paused at hyper-hard a2: two genuine consumer holds/no payload; B3 deployed, checkpoint d3e6b366 has 39 successes/1,550 requests; joint line-only F3 and conservative scheduling precede the remaining 73 chunks; Q3 is separate from mega16-easy Q2 |

## Goal & business context

Measure every offered performance-table cell, not a convenient fast subset, and verify all fixed
puzzle hashes after publication. A hash-only pass is not a timing gate.

## Scope and repository rules

In: published qualification-derived target rule, full GP, full GG check and evidence;
the explicitly bounded Phase-B deep-public-registration repair and file-only audit below.
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

Carry **MS18c-GQ-ENGINE-COST** into the existing cost analysis. **SA2's pooled
strict comparator remains primary:** 2,122 matched request pairs, ordinary pooled
median **1.1240344349341411** (1.1240). Its pairing requires the same cell/key/
index/seed and every recorded request field except `ms`, with positive old time;
there is no >50 ms filter or minimum per-cell cohort. For an even pooled count,
the ordinary median averages the two middle ratios.

**SA1's separate statistic is now precisely defined and reproduced**, following
the orchestrator's **2026-11-19T11:33:33.392+07:00** clarification:

1. Within each cell, pair requests whose **seed, hit, achieved, score, solved,
   approximate, exact and valid** fields all match.
2. Keep a pair only when **both old and new `ms` are strictly >50**.
3. Keep a cell only with **at least five** such pairs: **51 eligible cells**.
4. For each eligible cell take the **lower median** of its `new.ms/old.ms`
   ratios; then take the **lower median of those 51 cell values**. Lower median
   means sorted index `floor((n-1)/2)`, not the average of two middle values.

The overall result is **1.1284579100925456** (1.1285), not a pooled per-request
median. SA1 reran it under the lock; SA2 independently reproduced it file-only
from the immutable MS07e/MS18c records, without a new measurement.

| SA1 cell | Pairs kept / matching before the >50 ms filter | Per-cell lower median |
|---|---:|---:|
| mega16/Expert | 27 / 29 | 6.5559 |
| jigsaw9/Expert | 11 / 15 | 5.0815 |
| sohei/Master | 5 / 5 | 4.3160 |
| mega12/Expert | 11 / 18 | 2.6858 |
| diagonalX/Expert | 5 / 8 | 2.1076 |

This corrects the pack's earlier description of SA1's figure as a "median
per-request ratio" and its consequent "not reproduced" statement. Preserve the
frozen Phase-A report as history; carry this clarified definition in the current
handoff rather than rewriting the old report. The two statistics have different
filters and weighting and must remain separate, with SA2 primary. This affects
no target, admission, verdict or Phase-B permission. It is an engine-cost signal,
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

R24 also explicitly provides the bounded route (`report-detailed.md:1162-1165`):

> Use explicit variant/level shards and bounded monitored processes. If one cell cannot complete within
> the execution ceiling, implement a complete request-ledger/resume path or report it incomplete; do not
> drop slow seeds, invent a verdict or substitute `--probe` for qualification. Preserve source/seed identity
> and timing protocol when merging shards.

**O1 accepted:** `ad7d30e3`'s blanket single-command prohibition was too broad.
The assigned route is now
**[MS18d-r24-request-ledger.md](MS18d-r24-request-ledger.md)**: raw-time ledgers,
frozen contiguous/balanced chunks and a check-only merge, never merged rounded
percentiles. All 79 cells use this recorder, 62 as one chunk and 17 as 52 chunks.
Preserve 50 samples/cell and disclose the 35 extra cold process starts; this is
not a claim of numerical equivalence to one fresh process per cell.

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

**Current external-consumer halt:** B3 `8e95cb14` / records `bce27077` is
deployed. Checkpoint `d3e6b366` retains 39 successful chunks/1,550 requests
and the two legitimate hyper-hard holds. Follow
`MS18d-hyper-hard-holds-and-scheduling.md`: line-release-only F3 after joint
agreement, separate Q3, and the bounded scheduling procedure before the
remaining 73 original chunks/2,300 requests. No admission refund, CPU/service
exemption or frozen-helper change. Conditional B4 may contain only explicit
named Q2/Q3 grants; keep `final.m1` unused until both questions are resolved.

**Earlier second halt:** reviewed B2 **`b6de2c46`** / H2 **`bd6949ef`**,
declaration **`42533fcc`**, produced a real a2 control-hold at acquisition,
exit 64, no readiness or payload. C-log line 24 is a typed no-acquisition
pre-window event; `release-history.js` wrongly requires its `finished`.
The a2 folder and log are checkpointed at `ed95a1f0`. Both admissions are used: a1 was a
legitimate CPU hold, a2 the tooling defect. Do not retry/relabel a2.
**`MS18d-epoch3-release-history-repair.md`** assigns the semantic reader fix,
keeps `at`/no `finished` on future no-lock give-ups, and requires reviewed B3
rather than amended B2. With the joint F4 line-only disposition, the other
91 chunks may continue regardless of pending **MS18d-Q2**. Current limits
remain two. Only an actual A answer enables the separately reviewed B4/a3-last
specification in `MS18d-epoch4-a3-exception.md`; B retains an incomplete cell
and failed 79/79 gate. No live continuation before the B3/F4 release gates.

**Earlier epoch-1 halt/ruling, historical:** B1 is **`a2e6423a`**, original base record **`f7f56cbb`**,
checkpoint **`4db0114e`**. Preserve 22 successful chunks (19 cells / 950
requests), mega16-easy's eligible unstarted a1 and its no-folder a2 watch give-up.
The R2 freshness loop starves on its own full rechecks; it is not a GP timeout.
**`MS18d-epoch2-transport-repair.md`** assigns fix (b), exact two-epoch R3
compatibility and the developer tests/base-2 record/resume sequence.
SA2 concurs with SA1: no owner question, restart, rerun or retagging.
The repair and check-only merger changes land together in reviewed B2.
Next actual payload is only **mega16-easy.i0.n50 a2**, still subject to fresh
admission; the pre-window hold consumed no admission and needs no F3 ruling.
All writes and Node work are locked while paused; nobody measures before
the B2 freeze/record and `validate-journals --base B2 --live` succeed.

**Current dispatch, after Phase B `50903182`:** the orchestrator verified the
17 target updates, 135-position freeze **`3d0bffdb...`**, eleven contrasts,
seven deep public removals and unchanged 4,807 quick registrations, 104/104 GG
shards and the 520/520 check-only merge. SA1 gave **ACCEPT WITH CONDITIONS**:
three record-only additions/refreeze are committed at **`b3144fcf`**; no
implementation rework. Player quick is now **`aa352658...`**, Generator quick
**`49089814...`**, and Generator with-manual **`176f9c95...`**. Both complete
quick sets still belong to Phase D. The deep-registration item is **closed on
file evidence** in that committed handoff; no live deep result is implied.

**Read [MS18d-phase-c-admission.md](MS18d-phase-c-admission.md) as the current
dispatch addendum.** It retains C0 with SA1's **C0-1..C0-6** conditions and
releases **C0b**, the raw-time recorder/manifest/merger and stand-ins.
**Implementation update:** C0/C0b is committed at **`56b97b26`**, 710 files;
SA1 **ACCEPT WITH CONDITIONS F1-F6 and released C1**. The baseline
`helpers-c` SHA is **`c07f308b...`**, not the final C1 helper identity.
**[MS18d-c1-readiness-and-rulings.md](MS18d-c1-readiness-and-rulings.md)** now
governs the precreation/attempt checks, committed rulings/global stop,
strict merger holds, mandatory A readiness, verified host-rebinding procedure
and B-freeze checklist. No real recording is released by that acceptance.
The later combined review of **`e62d0931`** (helpers-c1 **`3dd18e8e...`**) is
ACCEPT WITH CONDITIONS; pre-B **`27128684`** has host-b1/evidence and an empty
C log. The developer owns C1-review-R1/R2 fixes and helpers-c1b refreeze.
**P1 is documentation-only:** a jointly approved F3 line for a started failure
may lift F4 for **other chunks/final merge**, never retry/replace that chunk.
The existing attempt guards and merger continue to enforce that distinction.
B is the accepted fix commit after SA1's short check; its one-line pack-path
record is specified in the C1 leaf and does not replace `-CampaignBase <B>`.
**S-OD15 now records A**, owner Discord message `1572872444602228798` at
**2026-11-19T07:13:33.350Z**; C1's owner-answer gate is resolved.
The extra "100% resource" clause is a scheduling allocation, not permission to
change caps/gaps/locks, run concurrent timed workloads or relax re-asks;
the supporting plan records the full resource ruling now concurred with by SA1.
The S1 message is now an informational status update, not another gate.
It was posted as message **1572878023034675262** in channel
**1571779348573323334**, at **about 14:37 +07:00**, and is recorded in S-OD15.
SA1 concurs with `e4cd92d6` and the resource interpretation, with **R1-R6**
binding in the R24 leaf: exact merger exits/folders, campaign-base ancestry,
immutable-history counts, executed-byte/Node-flag identity and final attribution.
Timing remains **C2**, after tooling review/freeze and fresh per-chunk admission.
All **79** cells have conditional numerical plans: **114 commands**, maximum
P **448 s**. S-AV11 remains held for lack of its separate current-tuple bound.

The following Phase-A/B chronology and the original question remain history:

**Phase A is complete at `602af371`**, 28 files. The orchestrator verified all
**25/25** freeze entries, bound identities, the 79-row table, 62 retained targets
and 17 proposals (**11 ceil(3q), six budget-capped**), and **29/29** locked tests.
Sohei Hell 2 is the only mean alert above 450 s; **all 79 GP cells and the S-AV11
tuple remain unadmitted**. The primary strict 2,122-pair comparator reproduces.
SA1's subsequently clarified filtered cell-median statistic also reproduces as
defined above; Phase A's earlier non-reproduction note used the wrong description.
Neither comparison is a causal proof or a command-admission bound.

Phase-A disclosures remain: one unlocked `node --version`; nine own gaps of
**14.2-14.9 s** from the wrapper bug, subsequently fixed. Preserve those records
as deviations; do not relabel them >=15 s or inherit an exception. The audit also
identified exit-1 MISS/crash ambiguity, loss of a buffered transcript on a 540 s
kill, and possible stale lock after `stop_powershell`.

The orchestrator **released Phase B**, which started at **11:08:38 (+07:00)** and
stopped for the target-pin QUESTION before any edit/Node run (clean at 11:10:57).
The orchestrator relayed **SA1 CONCURS WITH CONDITIONS** and resumed Phase B
at the 11:33 update. The two GG/CV6 conditions below are binding; this pack update
does not add another pause. **At that relay Phase C was not released** and
**MS18d-Q1 was unanswered on Discord** (2026-11-19 11:11). No GP/S-AV11 run,
pilot or live readiness campaign follows from Phase B.

### MS18d-Q1 — answered A; original environment question and current scope

**Sent through the orchestrator to the owner; not a Fable question.**
Its authoritative answer is the S-OD15 selector: **A**, received
**2026-11-19T07:13:33.350Z**, owner **amicably8850**, channel
**ai-agent-session2 / 1571779348573323334**, message **1572872444602228798**.
The verbatim answer and resource interpretation are recorded there, not a
second mutable selector here. At Phase-B completion it was still unanswered.
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

The question offered **one policy for the whole matrix/profile**; **A is now
chosen**, B retained below as the unchosen alternative:

- **A — explicitly authorize `MS18d-GP-host-active`.** Keep the raw five-interval
  strict screen and `ready` separate from named-policy `admitted`. Verify the named
  host, own/foreign locks and per-instance counters; hold for any additional
  consumer at **>=0.5 CPU-s per elapsed second**, unknown/invalid required facts,
  or known foreign heavy work. No service/whole-process-tree exemption.
  The requested grant includes **one >=60 s fresh-slot re-ask only after a verified
  unstarted additional-consumer hold**, maximum two admission attempts per immutable
  **chunk/protocol identity** under the assigned R24 route (one unit for a one-chunk
  cell or the separate profile). A second hold is an unexecuted gap, not a failed/hidden cell.
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
faster-repeat selection, new guard, arbitrary split or GQ watchdog follows.
The separate R24 raw-ledger route is already authorized and explicitly assigned,
not inferred from the A answer or its resource clause. S-OD14's
one-recovery permission was **GQ-only** and is not inherited.

**The scope limit matters:** A does not admit Sohei Hell 2's monolithic command:
its existing FS23 mean alert is **485.597 s >450**, before setup/margin.
The assigned R24 plan now supplies **six chunks (9,9,8,8,8,8)** within 450/540.
This closes the planning obstruction, not the measurement or its performance
verdict. A readiness decision never extends a deadline or makes a partial gate pass.

**Original owner-question wording, preserved as history:**

> **MS18d-Q1 — môi trường đo GP:** S-OD13 chỉ cho phép GQ host-active, chưa cho GP.
> Anh chọn **A**: cho GP và profile S-AV11 chạy theo chính sách
> `MS18d-GP-host-active`, vẫn lưu màn hình strict; chặn tiến trình khác dùng
> >=0,5 CPU-s/s, chỉ hỏi lại một lần sau >=60 s cho CPU hold chưa chạy payload;
> hay **B**: giữ máy thật yên theo strict và bố trí phiên/máy phù hợp?
> Cả hai giữ 50 mẫu/ô, jobs 1, trace summary, warmup 0, seed và target chốt trước
> khi đo; không trừ CPU, không chọn lần chạy nhanh hơn, không nới 450/540.
> Riêng Sohei Hell 2 đã có cảnh báo 485,597 s >450 nên chưa được chạy; chọn A
> không cấp thêm thời gian, và còn thiếu ô thì không công bố GP hoàn tất.

**S-OD15's one-line selector now records the answer and delivered S1 notice.**
Preserve the receipt before the future campaign base B is frozen; it is
information, not another owner approval. C0/C0b remain tooling-only
releases. C1 can implement selected A after its existing dependencies; the
selected launcher and recorder still need review/freeze before C2.
The resource clause does not authorize parallel GP, shorter gaps or new retries.

### Readiness and runtime obligations once released

- Obtain the orchestrator's shared window and normal mutex for **each chunk**;
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
  transport/deadline/exit/cleanup supervision remains. The orchestrator pauses
  now-unneeded pollers/reports; no optional sampler or other workload during a chunk.
- One fresh recorder process per frozen chunk, one contiguous **n-run** `measure`
  call; the check-only merge requires all **50** original indices per cell;
  no warmup/prefetch, process-priority change, internal restart or independently
  detached payload. Audit any wrapper/tool wait so it does not truncate the
  existing 540 s envelope or leave an orphan. Status reads reset no deadline.
- Freeze sources, targets, policy, Node/machine, selected request and output identity
  before the first timing and verify them before each admission. Never mix policies,
  machines, targets or producer versions into one claimed final matrix.
- **R3:** record base commit B after final tooling/manifest freeze and before
  the first real chunk. Preserve actual ledger HEADs; B/descendants are valid
  only when `git diff --name-only B <HEAD>` lists exact campaign-output paths
  or pack files under `tasks/difficulty-v3/`, with all content identities unchanged.
  **R4:** reconstruct attempts/payloads from immutable run folders and the
  append-only C lock-log, not a mutable counter file or current-HEAD namespace.
- The Discord background poller stays paused during GP payloads. Reports,
  one-shot communication and permitted checkpoints are **between chunks only**,
  after G5 proves no payload alive and before fresh checks for the next chunk.
- **From C1 every agent Node command is locked**, including version/check and
  Discord. No agent runs any Node command outside the approved GP tree during
  a timed payload. The orchestrator stops `node discord.cjs` and sends/polls
  only in locked between-chunk calls. The accepted earlier unlocked calls
  remain disclosed deviations, not a precedent.
- **Host/ruling authority:** SA2 rules, SA1 concurs, and the orchestrator
  alone appends/commits the pack's operational JSONL journals. ProcessName
  renames do not change a binding; actual tuple changes hold for verified
  rebinding. Rebinding never resets attempts, releases F4 by itself or grants
  a started-payload retry.
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

The accepted input gives these **17** changes, now reproduced by the committed
Phase A file-only preflight, with q, old target, predecessor, unclamped ceil and
budget. Phase B writes exactly this reviewed table, not a new calibration choice.

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

### Phase B target-pin QUESTION — ruling A, 2026-11-19

**Option A is concurred with by SA1 and Phase B has resumed**, subject to the
GG/CV6 conditions below. It is a narrow, coupled expectation update implementing the already authorized 17
target changes; it is not permission to weaken a test or update other pins.
Options B (leave a knowingly obsolete pin failing) and C (drop value checking)
are rejected.

There are **two distinct assertions**:

- **Keep `generator\tests\manual\perf.test.js:52-60` unchanged**: the existing
  table/offered-level/positive-target consistency assertion does not pin old
  numbers and remains valid.
- **Update only the affected quick target-value test** in
  **`generator\tests\suites\manual-corpus.test.js:781`**. Its old "79 unchanged
  targets" expectation was correct for MS18c's alignment-only step, not for
  MS18d's now-authorized recalibration. The permission below applies to this
  quick test and its local expectation/comment, not the manual consistency test,
  smoke test, corpus assertions or canonical puzzle/replay/help fixtures.

Exact constraints on the quick pin:

1. **Keep the `OLD` table's values unchanged**, including its nulls. It remains
   the historical basis for 39 removed and 17 never-offered positions.
2. Add a local **literal 17-entry expected-target map** whose key set and values
   equal the frozen Phase-A proposals / table above. Do not derive expected
   values from the live `PERF_TARGETS`, `cells()`, edited design table or the same
   runtime implementation being checked.
3. For **every** offered cell assert `[key, target]` equals the explicit override
   when that key exists, otherwise the original `OLD` entry. Assert all 17
   override keys are offered and actually used, each is a positive integer and
   a real change from OLD; **exactly 17 updated / 62 retained**. A map-length
   assertion alone is insufficient if an entry can be hidden or unused.
4. Preserve all existing **15 variants, 79 active, 56 hidden, 39 removed /
   17 never-offered** checks, hidden-key absence, positivity and the exact
   `cells()`/independently enumerated registry-support comparison. No skip,
   narrowed loop, removed assertion or target tolerance.
5. Retitle **that `it` only** to describe "62 unchanged and 17 recalibrated
   (MS18d)". Keep the enclosing describe and sibling smoke test unchanged unless
   an actual further need is separately assigned. Record the one old/new full
   test name; **no test added/removed and no CI membership/count change**.
   Update `generator/design.md` **15.1** to describe the actual check.

The no-canonical-fixture rule still bars `regression.js`, wire/analysis/help
expectations and unrelated test pins. This one expected **performance-target**
map is expressly assigned; no other ownership expands.

### Confirmed Phase B plan and required safeguards

- **Target/data/docs:** change only the 17 reviewed target literals and directly
  related header prose. Design **9.1** may display seconds with up to **three
  decimals**, provided conversion is exact to the integer millisecond:
  e.g. `< 2.342 s` = 2342 ms, `< 30 s` = 30000 ms; `< 31 ms` and `< 0.031 s`
  are equivalent. Do not round 2.342 to 2.3, change strict `<` to `<=`, change
  any of the 62 retained values, or replace hidden `—` cells with zero.
  Keep MS18c's alignment-only statement as dated history and describe the new
  MS18d qualification-derived update accurately. **This is not a GP measurement
  or a Chrome/reference-machine performance pass.**
- **CV6/deep wording:** update design **15.1** and **15.2** (the `manual-corpus`
  row and clearly labelled retained-budget note), plus the relevant text in
  **both developer guides**, distinguishing the manual suites' retained
  `BUDGET_MS` and the separate deep-only `BOARDS` contract (with their existing
  `SG.test.timeLimit` application)
  from the CLI GP `PERF_TARGETS`. No manual budget, hit/soundness threshold,
  seed, population, tier or factor changes. Greater-Than Normal's 700 ms
  contract is not reopened.
  **SA1's concrete documentation condition, extended by ruling B below, is
  required:** list every identified retained manual/deep budget that numerically
  differs from the new 9.1 GP target, with both
  values and its statistic, in those design sections, **both developer guides**
  and the Phase-B handoff. Do not stop at a generic disclaimer or the examples
  in the original question. See the complete current mismatch inventory below.
  **Section 15.5 is the manual browser checklist, not this budget discussion**;
  the earlier 15.1/15.5 pack reference was mistaken. Do not insert unrelated CV6
  text there merely to follow that stale reference, or claim the quick
  `manual-corpus` test executes the mega deep gate.
  Existing CV6 titles saying **"design.md 9.1 budget of N" refer to retained N**,
  not the recalibrated GP target. **No manual-CV6 title, `BUDGET_MS`, threshold or
  factor edit.** The already approved quick target-pin test rename is separate.
  A later live MS18e failure against retained N is an honest S-OD4 outcome, not
  authority to align its budget with GP.
- **Freeze before GG:** retain a complete **135-position** target snapshot
  (79 active / 56 absent), the exact 17-diff map and all source identities
  under new Phase-B evidence. Preserve Phase A's original preflight, helpers,
  transcripts, hashes and disclosures unchanged; do not rerun it over the new
  target data and overwrite its baseline.
- **Identity expectations, verified not assumed:** the producer remains
  **`75b0955e3e356bd1`**. The E hash-family identity **must change** from
  `1032ab2f510fe2b9ed1bac744f534d5cfee7e039f456fc56d3e19682d53158a0`
  because its recipe includes `perf-helper.js`. Replay **should remain**
  `1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc`:
  neither that fixture, these guides/tests nor task-owned wrappers are in the
  replay source recipe. Recompute both; an unexpected change is a QUESTION.
  Do not retag or mix the old hash ledgers into the new hash-family merge.
  Accepted wire/analysis evidence is retained only after exact replay identity
  verification; no rerecording merely for a new task ID. Quick/manual fingerprints
  change with the target/test/design/guide edits and belong to final Phase D.
- **Focused checks:** run **`perf-tooling,smoke,help,manual-corpus`** under the
  lock after these edits. Verify every new target against frozen Phase A and
  the independent expected map. A failure is not acceptance, and the final
  complete quick sets remain Phase D's obligation.
- **GG:** the existing **104 five-seed shards** cover the same 520 fixed keys.
  Retain their requests, diagnostics and expected hashes; merge-check only,
  **no update flag**. The approximately 399 s prior total / 30 s maximum shard
  are compatible-source observations, **not a bound**. Plan each sequential
  compound conservatively at **<=450 s including all child startup, I/O and
  any internal sleeps**, with the hard 540 s envelope. Keep **>=15 s between
  actual lock releases/acquisitions**; all gaps count where they fall within
  an outer command. No overlapping children, unbounded compound or assumption
  that all 104 fit because their old generation sum was 399 s.
  **SA1's GG pass condition:** a real shard counts only with **exit 0 AND its
  complete five-key ledger**, with the exact selected keys and current identity.
  **Only the complete 104-ledger check-only merge, exit 0 with all 520 unchanged
  expected hashes matching, can pass GG**; individual successful recording commands are not that pass.
  **STOP + QUESTION** on any nonzero exit, signal/kill, missing/partial ledger
  or merge mismatch. Do not classify one as a GP `MISS`, retry, regenerate a
  replacement or otherwise continue dependent GG work without a ruling.
  Keep the failed shard's partial transcript and ledger. This applies to real
  GG work, not the predeclared expected failures of isolated wrapper stand-ins.
- **Move the incremental transcript repair ahead of the first long GG compound.**
  It is in scope as a task-owned wrapper repair, not a perf/measure change.
  Preserve output durably as it arrives, keep partial output on timeout/kill,
  and preserve real exit/signal/error semantics. A killed run has no fabricated
  completion/exit-0 marker. Do not let a tee or caught PowerShell exception mask
  a nonzero result and allow dependent work to continue.
- **Version the repair:** use new helpers under
  **`generator\tests\artifacts\difficulty-v3\MS18d\phase-b\`**, including the
  incremental tee and its invoking wrapper/tests; use new transcripts/lock log/
  freezes under **`docs\difficulty-v3\evidence\MS18d\phase-b\`**. Keep the six
  Phase-A helper files and all 25 frozen entries byte-identical. Carry the last
  known release across the log boundary; a new filename is not a gap reset.
  Existing `hashes\` is the new GG ledger folder, not a Phase-A output.
- **Short stand-ins only for wrapper verification:** normal success, nonzero
  exit, spawn failure and kill mid-output; show bytes exist **before** child
  completion and remain afterwards, with no false completed result. Verify
  owned child/grandchild cleanup and the actual >=15 s gap. Keep the real
  `Invoke-Dv3Node` parent alive when killing an owned fake child; forced-parent-
  loss tests use isolated project-local test lock/state or explicit orchestrator
  coordination. A stale **real shared lock** is reported for orchestrator-only
  verified cleanup (correct instance dead, no owned process alive), never
  automatically deleted by age/PID alone or treated as a foreign lock to remove.
  The shared helper/540 s contract is unchanged.

After focused/GG checks, freeze the **new** Phase-B helpers/outputs and re-verify
Phase A still **25/25**. Record changed identities and the one test rename in
the Phase-B handoff. **No GP, S-AV11, pilot, live timing-admission campaign or
Phase-C release** was granted by that Phase-B ruling. At that point Q1 was
unanswered and all 79 cells unadmitted. Current C0/C1/C2 permissions follow the
supporting plan and S-OD15; the Sohei Hell 2 hold remains unchanged.

### Retained manual/deep budgets versus the new GP table — documentation, not edits to tests

**SA2 inventory ruling B, `4b9e5a1f`, concurred with by SA1 with conditions
(2026-11-19 12:06 relay):**
keep **eleven** documented contrasts:
the ten manual rows below **plus one separately labelled SG_DEEP-only row**.
The ten-row list in `9ab6cd4b` was correct for its manual subset but incomplete
for retained deep coverage. Do not remove the valid mega row from the design,
either guide or the Phase-B freeze checker's documented list to force a count
of ten. This is a documentation/inventory clarification, not an eighteenth
target change or permission to edit a test.

The following are **base milliseconds**, before each retained check's existing
`SG.test.timeLimit` factor. GP uses its unscaled p95 target; classic9's
`difficulty.test.js` check is a **median** gate and keeps its existing middle-index
calculation, not GP's percentile/cohort. The columns compare two retained/different
contracts, **not an instruction to replace the retained number**.

**Manual retained thresholds (ten rows):**

| Manual suite / row | Statistic | Retained manual ms | New 9.1 GP comparison ms |
|---|---|---:|---:|
| killer / normal | manual CV6 p95 | 700 | 5425 |
| jigsaw / easy | manual CV6 p95 | 350 | 1905 |
| jigsaw / hell2 | manual CV6 p95 | 5000 | 10000 |
| wordoku / easy | manual CV6 p95 | 250 | 2921 |
| extra-regions / normal | manual CV6 p95, common larger-row budget | 200 | **1573** = max(diagonalX 200, hyper 1573) |
| extra-regions / nightmare | manual CV6 p95, common larger-row budget | 3000 | **10000** = max(diagonalX 10000, hyper 10000) |
| difficulty / classic9 easy | manual median | 150 | 2342 |
| difficulty / classic9 normal | manual median | 150 | 2627 |
| difficulty / classic9 expert | manual median | 600 | 1323 |
| difficulty / classic9 nightmare | manual median | 2500 | 8377 |

The six variant-specific p95 rows cover **seven** recalibrated GP cells because
extra-regions shares the larger diagonalX/hyper row; the four classic9 median
rows are listed separately. At the approved targets these are all numerical
mismatches among the offered comparison rows of those named manual suites. No new
Greater-Than offered-row mismatch occurs. Hidden rows have **no GP target**, not
zero, and retain their existing manual constants/registration disposition; do
not invent a numeric comparison or re-enable a hidden public timing case.

**Non-manual, deep-only retained threshold (one additional row):**

| Retained check / row | Statistic / execution tier | Retained base ms | New 9.1 GP target ms |
|---|---|---:|---:|
| `suites\mega.test.js` / mega12 Nightmare | `SG_DEEP=1` only: p95 of 20 seeds, sorted `times[18]` | **3000** | **18842** |

Verified anchors are `BOARDS.mega12.budgets.nightmare` at **62-77**, the
`SG_DEEP=1` branch at **1112-1138**, and `QUICK_LEVELS` at **42** / its use at
**729** (locate by symbol/title if lines move). The deep test is
**"20 seeds, hit rate and p95 time against section 9.1"**: seeds **1..20**,
trace off, existing 120000 ms request budget, unchanged hit-rate and p95
assertions. It applies **`SG.test.timeLimit(3000)`**, not 18842.
Its legacy title "against section 9.1" likewise names this retained deep
contract, not the newly recalibrated GP target.
Nightmare/Hell 1 full-attempt requests are excluded from `QUICK_LEVELS`;
neither ordinary quick runs nor CI executes this row. Do not call it a manual
suite, add it to quick/CI, or confuse it with the separate quick smoke limits.
The unoffered mega16 rows have no GP target; no numeric zero comparison is implied.

Keep the eleventh row in the **design 15.1/15.2 documentation, both developer
guides, `freeze-targets.js`'s documented inventory and Phase-B handoff**, with
its deep-only label. The `manual-corpus` suite description must still accurately
describe that quick test's actual checks; the retained-budget inventory is
documentation, not a claim that the quick test runs this deep branch.
The complete inventory may sit in 15.1 with a scoped cross-reference from 15.2;
the long numeric list need not be duplicated inside the quick-suite table row.

For MS18e's already-planned deep validation, a timing-only failure against the
retained 3000 ms base is an **honest S-OD4 failed result**, not authority to
realign it to 18842, relax/skip/rename/move the test or claim its gate passed.
Retain source, selector, original request population, time factor, actual
measurements, exit and named disposition. Availability/hit-rate findings keep
their own real status; correctness/uniqueness/unsoundness or evidence failures
retain their blocking rules. This note grants **no new SG_DEEP run or population
expansion** and waives no separate deep selection/compatibility requirement.

The developer's reported tee **8/8**, wrapper **9/9** and target-freeze **5/5**
checks are provisional pre-format evidence in this question, not a GG pass.
Keep existing outputs; finish the helpers' format pass before final freezing
and re-run the affected helper checks with honest identities/new evidence.
Do not delete or retag preliminary records. Focused/GG work remains governed by
the existing release, bounds and STOP/QUESTION rules; no Phase-C permission follows.

Verify this inventory from the unchanged manual/deep declarations and the frozen
target plan when writing the design/guides/handoff. A later source difference
must be reported, not silently handled by changing an assertion. The existing
manual/deep titles, thresholds, budgets, seeds, counts, time factors and
public/diagnostic/tier boundaries all remain as accepted, except for the
explicitly assigned public registration removals in the addendum below.
**The original inventory-only ruling assigned no `mega.test.js` edit; the
following narrow assignment supersedes that exclusion, not its budget ruling.**

### Phase-B addendum — deep public registrations, not diagnostic population changes

**Historical Phase-B assignment, now closed on file evidence at `50903182` /
`b3144fcf`, not live deep execution.** Item
**MS18d-DEEP-PUBLIC-REGISTRATIONS** required the repair, bounded audit and
registration evidence below. SA1 identified the missed mega branch
after MS18c acceptance; preserve that acceptance/history and record this correction
explicitly rather than leave known `difficulty.unsupportedLevel` failures to the
planned MS18e deep run. No owner decision is needed: apply the existing step-5
public per-level rule, not a new threshold or tier policy. Ruling B's eleven-row
inventory and honest failed S-OD4 timing treatment remain unchanged.

**SA1's condition, verbatim:**

> In `generator\tests\suites\mega.test.js`'s `SG_DEEP=1` branch, register the per-level deep test only for levels in `PUBLISHED[id]`, under the step-5 public per-level rule.
> - Keep unchanged: `LEVELS`, `BOARDS` budgets, seeds 1..20, the 120000 ms request budget, hit-rate and p95 assertions, titles and tier.
> - Record the three removed deep registrations (mega12/hell1, mega16/nightmare, mega16/hell1) with their GQ verdicts in the Phase-B handoff.
> - Prove the quick inventory is unchanged with `--list-tests`, and that the `SG_DEEP=1` registration list drops exactly those three.
> - No deep run in MS18d. Mega12 Nightmare stays registered, as the eleventh inventory row.

**Additional directly verified hit, assigned by SA2 under the same rule:**
`generator\tests\suites\multigrid.test.js:1086-1107` has the same unfiltered
public deep loop over `BOARDS[id].levels`. Its existing `PUBLISHED` map excludes
**Easy for samurai, sohei, butterfly and flower**, yet that branch directly calls
`SG.pipeline.run`, not its existing diagnostic `asRequested` helper. Remove
exactly these **four Easy public deep registrations** using the same membership
check before `it`. Keep `BOARDS` levels/budgets, `HIT_RATE`, original order and
indexes, seeds 1..20, trace off, 120000 ms request budget, test timeout, p95/index
calculation, uniqueness assertion, titles and tier unchanged.

Only these **two branch-local registration filters / seven named removals** are
authorized. Keep the original loops/arrays and skip registration for a level
absent from `PUBLISHED[id]`; do not rebuild or compact a level ladder, replace
an assertion, call `it.skip`, expand public support or add a diagnostic override
to make a hidden public timing case run. All retained test bodies stay unchanged.
Do not filter fixed diagnostics, existing `asRequested`/`withRequestedLevel`
corpora, aggregate/trend/soundness checks, `mega-contract.js`, recovery requests
or GG/GR manifests. In particular, GG's fixed Samurai Easy request remains.

**Authoritative GQ references for the removal map**, read file-only from
`evidence\MS18c\merge\qualification-v3.json` at this ruling; these are **not new
deep measurements**. Each removed public deep registration requested seeds
**1..20, count 20**. Record its full original test name, local level index and
canonical nine-level index, original request options/count and GQ reference in
the new Phase-B handoff/map, without changing accepted MS18c records.
Every row below has GQ budget **30000 ms**; keep the actual early-stop reason.

| Suite / removed cell | Original local level index | GQ hits / n | GQ verdict / stop | GQ p95 ms |
|---|---:|---:|---|---:|
| mega / mega12 hell1 | 5 | 0 / 9 | hidden / time | 105764.751 |
| mega / mega16 nightmare | 4 | 25 / 25 | hidden / time | 60754.8719 |
| mega / mega16 hell1 | 5 | 0 / 9 | hidden / time | 120015.1966 |
| multigrid / samurai easy | 1 | 10 / 22 | hidden / misses | 1129.1194 |
| multigrid / sohei easy | 1 | 4 / 18 | hidden / misses | 899.3724 |
| multigrid / butterfly easy | 1 | 1 / 15 | hidden / misses | 1115.6109 |
| multigrid / flower easy | 1 | 0 / 14 | hidden / misses | 901.8375 |

**Bounded follow-up audit: one file-only pass, no general test repair.**

- Inventory `*.test.js` under **`generator\tests\suites` (37)**,
  **`generator\tests\manual` (8)** and **`core\tests\suites` (18)**: 63 files
  at this base. Search `SG_DEEP`, `SG.test.deep` and their aliases; follow the
  resulting deep-only registrations/volume changes and per-level producer calls.
  Trace existing runner/corpus helpers only as needed to classify those calls.
- Include the named candidates **multigrid, killer, jigsaw, extra-regions,
  wordoku, difficulty**, plus **mega and manual variants**. The initial source
  screen finds actual mode switches in mega, multigrid and manual variants;
  document the others' negative/classification results, not just grep silence.
  A technique named `nishioDeep`, a `deepEqual` call or a help-text assertion is
  not a deep execution gate.
- Distinguish public per-level checks from fixed diagnostics: published
  intersection for the former; original population plus existing restoring
  guards for the latter. Manual variants' deep volume uses its public support
  population; do not convert the five manual suites' fixed diagnostic ladders
  into that population or reopen their accepted aggregate assertions.
- Record inspected files/branches, public membership, guard/corpus route and
  verdict in the Phase-B handoff. **Any further positive or ambiguous finding
  is a `QUESTION:` before editing it.** Report the exact source, affected
  registrations/requests and proposed classification. No blanket permission to
  filter other loops, fix another suite, change thresholds or widen the audit.
  The seven explicitly named removals above need no second discovery question.

**Registration proof and release boundaries:**

1. Capture the ordinary Generator **`--list-tests`** inventory **before and
   after these filters**, with deep mode unset. Compare full names/membership,
   not only counts: zero change. Baseline the current Phase-B tree, so the
   separately approved `manual-corpus` target-pin rename is not mistaken for
   a new difference caused by this repair.
   Keep the real before/after fingerprint metadata: the expected zero
   membership/name delta does not mean the inventory JSON is byte-identical.
2. Capture the corresponding **`SG_DEEP=1 --list-tests`** inventories, with the
   same suite selectors before/after. Mega's named deep describe goes **12 -> 9**
   (exactly SA1's three); multigrid's goes **16 -> 12** (exactly the four Easy
   cases). The combined delta is **seven removals, zero additions**, with all
   other registrations unchanged. **Mega12 Nightmare remains registered.**
   Reconcile full names, source hashes and the removal map.
3. All Node inventory/identity calls still use `Invoke-Dv3Node`, transcripts,
   shared slot, bounds and >=15 s gaps. `SG_DEEP=1` is allowed **only for
   registration listing**, never a live test invocation here. Scope the
   environment flag to that child or restore it in `finally`; non-listing
   focused/GG commands must not inherit deep mode. No deep/manual generation,
   timed sampling or browser run is authorized by this audit.
4. Preserve before/after sources and outputs under the existing Phase-B evidence
   tree. Reconcile the diff so that only the two registration filters and
   directly coupled living documentation change for this repair. Preserve every
   retained test body, count per retained cell, budget and assertion; do not
   turn an unsupported-level exception into an accepted S-OD4 timing miss.
5. Close the named item only after this evidence and the bounded-audit outcome
   are reviewed. An unresolved additional finding must be explicitly assigned
   before Phase-B acceptance; no unsupported-level discovery is delegated to
   MS18e. Its eventual live deep results remain MS18e's obligation.

**Identity ruling — verified recipes, not just an expectation:**

- The two `suites\*.test.js` files are **not inputs to E hash `sourceHash`,
  replay `sourceHash`, or the GG request manifest**. `perf.js` hashes its
  engine list plus `perf-helper.js`, `tool-records.js` and `perf.js`; its
  `hashManifest()` uses the unchanged 26 `COMBOS` x 20 `SEEDS`.
  The replay recipe uses its existing source list and four recorder files.
  Keep all 520 GG keys, the 104 shards and the check-only protocol unchanged.
- The post-target E hash source identity currently is
  **`344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1`**;
  replay is
  **`1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc`**.
  These were reproduced file-only on the dirty Phase-B tree at this ruling.
  **The suite filters alone change neither**; the earlier `perf-helper.js`
  target edit already changed E hash from `1032ab2f...`, independently of them.
  Compare actual before/after identities; any unexpected change is a QUESTION.
- Generator quick **and Generator-with-manual** fingerprints include these
  suite files and therefore change. The two suite files alone do **not** change
  Player quick's fingerprint; the already assigned common-guide edits do.
  Complete final quick runs/fingerprints remain Phase D. Registration-only
  evidence is not a replacement quick pass.
- Git commit/dirty/Node metadata is distinct from source/manifest identities:
  report actual metadata, retag nothing. Do not rerun or rewrite GG/replay
  merely because a suite file or pack commit changed when the required
  source/manifest compatibility still holds. This grants no new Phase-C GP or
  S-AV11 permission; S-OD15, tooling review and per-cell admission are still
  prerequisites under the supporting Phase-C plan.

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

**Phase-C planning follow-up:** the supporting plan retains these original mean
alerts, supplements matching keys with existing serial GG maxima, and applies
`Pchunk = 60 + ceil(n*observedMax/1000)` to frozen balanced chunks.
These are reviewed empirical planning assumptions, not proofs of future times;
they require explicit orchestrator approval before any conditional row runs.
Seventeen rows exceed 450 s as monolithic commands, including Sohei Hell 2;
R24 now assigns their 52 bounded chunks. All 114 command projections fit,
maximum **448 s**, without a target or ceiling change.
No arbitrary fit-to-ceiling multiplier, pilot or source/CPU normalization is
authorized. The original frozen Phase-A report remains byte-identical.

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

**MS18d-GP-BOUND-sohei-hell2** preserves the monolithic mean-alert history:
485.597 s >450 even before allowances. Thirteen cells also have
`50*observed GQ maximum >450 s`; those maxima are descriptive, not future bounds.
Do not promote the other **78** cells to "safe" because their means are below
450. Each still needs a source-qualified whole-command planning basis, explicit
setup/readiness/variance margin and an orchestrator-reviewed admission.
Its planning obstruction is now closed by the explicit six-chunk R24 route,
not by treating a mean as a bound. Any still unsupported/unknown command stays
unadmitted; no fit-to-cap multiplier or pilot is authorized.

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

Do not launch an over-limit monolithic command. **C0b is the explicitly assigned
bounded measurement tooling allowed by R24/FS23**, not an automatic new task or
an unsupported CLI. Keep every cell in the intended denominator; absent valid
50-request ledgers its result is incomplete, not a subset pass.
`perf.js --seed=9525 --runs=25` still cannot supply a valid merged p95 from its
rounded output. The R24 recorder may use that offset for the **frozen second
25-request chunk**, because it retains raw times and the manifest fixes all 50
indices. Preserve trace/warmup/seeds/attempt defaults, disclose each extra cold
start, and merge only raw times. No patch to `perf.js` or `measure` is assigned.

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
- **C0 released now:** versioned G1-G5 copies/tests under
  `generator/tests/artifacts/difficulty-v3/MS18d/phase-c/`, isolated stand-in
  evidence under `evidence/MS18d/phase-c/tooling/`, and SA1 review. Preserve all
  accepted A/B files. **C1's CPU/readiness/admission implementation is not
  assigned to C0**; S-OD15 A now resolves its answer gate, with the remaining
  C1 dependencies/review intact. C2 needs reviewed chunk plans and tooling.
  The supporting Phase-C plan is normative for this boundary.
- **C0b released now:** task-owned recorder, frozen 114-chunk manifest,
  check-only cell/matrix merger, typed G3 adapters and fake/file-only tests in
  the same `phase-c/` trees, exactly under `MS18d-r24-request-ledger.md`.
  No real generation or new live sampling is authorized by this tooling release.
- **C1 released with F1-F6:** integrate selected A readiness and the precreation/
  attempt/global-stop/merger fixes in the Phase-C helpers; add stand-ins and
  version new final freeze outputs. The pack-only journals
  `tasks/difficulty-v3/MS18d-gp-rulings.jsonl` and
  `tasks/difficulty-v3/MS18d-gp-host-bindings.jsonl` are read-only to the developer.
  Their committed appends belong to the orchestrator after SA2/SA1 approval.
- **Phase D, not C0b:** update Generator design **9.1's status text** and
  `docs/difficulty-v3/performance-v3.md` to attribute final GP numbers to the
  task-owned R24 recorder calling `perfTools.measure`, not `perf.js` stdout.
  Correct coupled final-GP wording in both developer guides if present.
  Make these non-pack document edits after the campaign's final merge and
  before final quick fingerprints; no target/budget/test-threshold change.
- `generator/tests/fixtures/perf-helper.js` PERF_TARGETS only if the documented qualification rule
  requires it; corresponding Generator design 9.1 and both developer guides.
- **Phase-B pin amendment:** the single target-value test/local expectation in
  `generator/tests/suites/manual-corpus.test.js`, exactly as ruled above;
  Generator design **15.1/15.2** and the coupled manual/deep budget wording in
  both developer guides. No change to `manual/perf.test.js`'s consistency test or other pins.
- **Phase-B deep-registration addendum:** only the named `SG_DEEP=1` public
  registration filters in `generator/tests/suites/mega.test.js` and
  `generator/tests/suites/multigrid.test.js`, their Phase-B audit/inventory
  evidence and directly coupled living documentation. No other suite edit is
  authorized by the file-only audit; further findings are QUESTIONs first.
- Clarify GP-target versus retained manual-CV6 wording if needed, without changing
  a manual `BUDGET_MS`, test threshold, seed or population.
- No production code, `perf.js`/`measure` behavior, `regression.js`, replay/help
  expectations or other canonical fixture. All Git/PR actions stay orchestrator-owned.

## Implementation steps

### Phase A — completed at `602af371`; historical file-only scope

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

4. Phase A is verified and Phase B released; after the pin-ruling concurrence/
   resume, apply **only** the rule-derived 17
   targets (or return any mismatch as a QUESTION), with design 9.1 and both
   developer guides and the single coupled quick pin under option A above.
   Apply the seven named public deep-registration removals in the two assigned
   branches; perform the bounded source audit and before/after registration
   proof under **MS18d-DEEP-PUBLIC-REGISTRATIONS**, without running deep tests.
   Prepare/test the versioned incremental wrapper before long GG work.
   Freeze the complete target table and source identities
   **before GP**; keep every other positive target and all hidden/null cells.
5. Test metadata/target consistency and capture final hash-family identity.
   Re-record all **520** GG keys in existing bounded hash shards and merge-check
   against unchanged expectations. Target literals change the hash-family identity
   even though they are not puzzle-generation code. Keep all 26 combinations,
   hidden diagnostic requests and original seeds. No canonical update flag.
   This is functional/hash evidence, **not GP**. Its ordinary shared-slot/bound
   rules still apply. It may be separately released while Q1 timing remains held.

### Phase C — C0/C0b tooling; recorded A; C1/C2 review and admission gates

6. C0/C0b review at `56b97b26` **releases C1 with F1-F6**, not C2. Integrate
   the conditions and A readiness; rerun all seven suites, version/re-verify
   the final helper freeze, then obtain the **combined SA1 C0/C0b/C1 review**.
   The orchestrator follows the new leaf's B checklist: empty tracked C log,
   tracked rulings journal, committed initial host binding, current helper SHA/
   required plan, notice, clean bindings and no unresolved stop. Only then
   declare B and consider C2's actual per-chunk admission.
   Choose no policy/ceiling yourself. Neither Q1 nor a low mean alert is GO.
7. Record each admitted **frozen chunk once**, one `measure` call and raw ledger.
   The all-79 check-only merge requires **114 chunks / 3,950 distinct indices**.
   Retain complete numerical MISS results and cold-start flags. Do not resume,
   retry or replace failed/completed chunks or merge rounded CLI statistics.
   Any missing/compromised chunk keeps its cell and full matrix incomplete.
8. Run only the already-assigned S-AV11 fixed profile if its own current-source
   bounded plan is approved. Keep its trace-off/default-attempt request, restored
   diagnostic guard, stage data and limitations separate from GP.

### Phase D — aggregate and close honestly

9. Validate all transcripts/cell keys/source/target/policy/Node/machine bindings.
   **Only the final all-79 check-only merge is required**; do not automatically
   schedule selected-cell merges. Any optional one uses its exact frozen R2
   folder and a bounded locked run between payloads. Validate every recorded
   HEAD's R3 ancestry/paths, unchanged content identities and empty R5 flags.
   **79 complete results and >=72 successes** are required for a complete pass.
   Missing cells leave the result incomplete, not a pass of a reduced matrix.
   Record every timing miss, error, compromised run, hold and unmeasured item.
10. After the final campaign merge, apply **R6**: design 9.1 status and the final
    performance report name the **task-owned R24 recorder invoking unchanged
    `perfTools.measure`**, not `perf.js` output, as this campaign's source.
    Record actual completeness/chunks/cold starts and outcomes, not planned totals.
    Finish applicable coupled guide/count/fingerprint changes before both complete
    bounded quick sets; maintain CI metadata/projections by the existing rule. Any
    unexpected output change is a QUESTION before corrective/canonical writes.
    No automatic replay-wire/analysis/help rewrite or extra generation campaign.
11. Return the complete GP status, final 520-key check and inherited/new item
    register for **orchestrator review**. Include S-AV01 not offered, S-OD7,
    closed S-AV27, IR17, **MS18c-GQ-ENGINE-COST**, **MS18d-GP-BOUND-sohei-hell2**,
    **MS18d-GP-BOUND-REMAINDER**, **MS18d-C0-G1-G5**, **MS18d-C0b-R24**,
    **MS18d-C1-F1-F6**,
    **MS18d-DEEP-PUBLIC-REGISTRATIONS**, S-AV11 and the older source-qualified
    S-AV31/S-AV33/S-AV34/S-AV36-S-AV39 /
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
| MS18d-T01 | Every complete cell has all 50 original indices/seeds exactly once through the assigned R24 raw-ledger plan; only its frozen contiguous chunks may split commands; no dropped/substituted samples or failed/completed chunk retry |
| MS18d-T02 | Complete GP pass only with all 79 cells measured and at least 72 meeting strict unrounded p95 < target; all misses/errors/unknowns retained |
| MS18d-T03 | Fresh complete 520-key GG matches; any target changes follow only the documented rule |
| MS18d-T04 | Full preflight precedes timing; every >450-second projection has an explicit item/outcome, and missing/corrupt input is not hidden |
| MS18d-T05 | S-OD15 A recorded verbatim; fresh per-chunk admission, ordinary deadlines/gaps/locks and window integrity preserved; resource clause grants no timing-concurrency or recovery exception |
| MS18d-T06 | All 17 target updates derive from frozen GQ before GP; 62 retained targets/56 hidden positions unchanged; no manual-CV6 or output-fixture relaxation |
| MS18d-T07 | Stock CLI limitations reported honestly: no timing JSON/resume/jobs flag or inherited GQ guard; complete MISS distinguished from crash/timeout and rounded output from exact verdict |
| MS18d-T08 | Scoped target pin preserves OLD and all 79 exact values via 17 frozen overrides; counts/hidden positions/cells comparison unchanged, one test renamed and none added/removed; exact-ms documentation and distinct manual-CV6 wording |
| MS18d-T09 | Versioned append-as-arriving transcript wrapper/short stand-ins preserve partial failures and exit semantics, cleanup and >=15 s gaps; Phase-A 25-entry freeze remains intact; Phase B grants no GP/profile permission |
| MS18d-T10 | Every real GG shard has exit 0 plus five exact ledger keys; full 104-ledger check-only merge is the only GG pass; nonzero/signal/kill/missing/partial/mismatch stops for QUESTION without an automatic retry |
| MS18d-T11 | Design 15.1/15.2, both developer guides and handoff enumerate eleven retained-versus-GP contrasts: ten manual rows plus the separately labelled SG_DEEP-only mega12 Nightmare 3000 vs18842; no manual/deep title/budget/threshold/factor/tier changed |
| MS18d-T12 | Ordinary quick registration names/counts unchanged; deep mega 12 -> 9 and multigrid 16 -> 12 remove exactly the seven named hidden public cells with GQ references; mega12 Nightmare retained; no test-body/budget/diagnostic change or live deep run |
| MS18d-T13 | Bounded 63-file deep-registration audit documented; additional findings questioned before edits and assigned before Phase-B acceptance; suite-only changes leave E/GG recipes intact, update Generator fingerprints honestly and close MS18d-DEEP-PUBLIC-REGISTRATIONS with reviewed evidence |
| MS18d-T14 | C0 plus C0-1..C0-6 fixes pre-window/actual-start gaps, A/B/C logs, typed results/zero stderr, exact clean-input allowlist and PID+creation orphan cleanup without periodic payload work; stand-ins/review precede timing; C1 uses recorded S-OD15 A |
| MS18d-T15 | S-OD15's single selector governs A/B without inherited GP permission; all 79 row plans and the held S-AV11 tuple retain their status, limits and evidence; candidate/source-transfer assumptions are explicitly reviewed, not promoted by arithmetic or Q1 alone |
| MS18d-T16 | C0b uses the exact perf loader and one measure call/chunk; 114 immutable raw ledgers cover all 3,950 indices; check-only merge computes sorted[24]/[47]/[49], strict p95<target and the complete >=72/79 gate, rejecting gaps/duplicates/mixed identities |
| MS18d-T17 | All 35 extra cold starts and tie-inclusive upper-tail flags disclosed without sample removal; A attempt limits are per chunk; S1 is an informational status update, not a new owner question or acknowledgement gate |
| MS18d-T18 | R1 merger exits 0/1/2/3 have exact complete-result/zero-stderr semantics; R2 uses exact manifest-declared cell/all-79 directories; only final all-79 merge is required, optional cell merges are not automatic |
| MS18d-T19 | R3 records B after notice/tooling freeze; each ledger HEAD is B/allowed descendant with unchanged content identities; R4 derives quotas from immutable folders plus append-only C log, never a mutable counter or HEAD reset |
| MS18d-T20 | R5 hashes captured executed contents and records identical empty execArgv/NODE_OPTIONS with pre-spawn rejection; R6 Phase D design/report attribution names the R24 recorder/measure API; poller/reporting boundaries preserved |
| MS18d-T21 | F1-F6 precreation and attempt checks, committed joint rulings/global stop, strict artifact/command.exec rejection and complete A readiness are tested; real recording refuses before readiness integration |
| MS18d-T22 | Host tuple/journal/rebinding authority preserved, ProcessName ignored, no automatic rebind or reset; all seven suites rerun, final helper SHA and tracked empty C log/journals satisfy B checklist before combined review/C2 |

## Test plan and gates

**C1 is released with F1-F6; no real measure call follows from that alone.**
Use the C1 leaf's exact seven-suite rerun, host/ruling tests and B-freeze checklist.
Follow the supporting plan for the exact tests and staged C1/C2 releases.
The following is the **completed Phase-A command**, retained as history; do not
overwrite its frozen output using the post-update target table:

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

**Later payload examples, not current authorization.** The selected readiness
wrapper must invoke the assigned recorder for one admitted frozen chunk; a direct
command alone is insufficient. GG below is already-completed functional history:

```powershell
node tests\artifacts\difficulty-v3\MS18d\phase-c\record-gp.js --plan=<frozen-manifest> --chunk=<immutable-id> --out=<new-ledger>
Invoke-Dv3Node -Task MS18d-GG -NodeArgs @('tests\perf.js', '--hash-key=classic4/veryEasy', '--hash-from=0', '--hash-count=5', '--hash-record=..\docs\difficulty-v3\evidence\MS18d\hashes\classic4-veryEasy-00.json')
Invoke-Dv3Node -Task MS18d-GG-merge -NodeArgs @('tests\perf.js', '--hash-merge=..\docs\difficulty-v3\evidence\MS18d\hashes', '--check-hashes')
```

Persist each command's transcript under evidence/MS18d with its exit code. Complete all E hash
identities before merge; no --update-hashes. Jobs 1/no --jobs. Use the separately
reviewed per-chunk admission projections, not raw mean alerts or an assumed
1-540-second allowance. The historical duration estimates are not bounds.
**Announce the plan, obtain the shared slot and record
each timed chunk's owner-approved readiness policy and observations.** Include
readiness in the admission projection. Keep 540 s; only the assigned R24
allocation may split a cell, with every extra cold start disclosed. If an assigned
chunk cannot run/complete, retain its incomplete result and all traces; no further
split, pilot, replacement or new tooling route is implied.
For target/docs changes: focused Generator `--suite=perf-tooling,smoke,help`,
then both complete bounded quick sets on the final fingerprints, all through
`Invoke-Dv3Node`. Add no suite or CI membership change for task-owned fake tests.

## Definition of done & handoff

Return the recorded Q1 decision/policy, full preflight and distinct admission
bases, intended/completed cell coverage, immutable target arithmetic/source tuple,
all raw transcripts and the actual aggregate verdict (incomplete where appropriate),
complete GG evidence and the cumulative item list.
Include the S-OD15 record/resource ruling, S1 delivery status, C0/C0b/C1 reviews,
campaign B/recorded-HEAD proofs, 114-chunk manifest with exact merge directories,
immutable-history quota evidence, executed-byte/empty-flag bindings,
committed ruling/host-binding histories and complete A readiness,
raw ledgers/receipts and the one required all-79 merge. Preserve
the bound items' closed planning history and still-unadmitted S-AV11 tuple.
Only the complete raw-time merge, not a finished scheduler queue, closes GP.
Include the closed deep-public-registration item, seven-removal map and bounded
audit/registration evidence; preserve any additional named finding and its
explicit assignment rather than pass a known unsupported request to MS18e.
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
