# MS18b — Final cap and chain-window rechecks

| Header | Value |
|---|---|
| Depends on | MS18a accepted |
| Accepted base | `484b8a52` (MS18a); production/soak bytes remain the accepted MS17b candidate `57c1b10` |
| Size / active time | Small; 25-40 minutes plus GS |
| Owner / milestone | Evidence; M18b defaults reconfirmed or escalated |
| Authority | R5/R9/R24 |
| Review | Orchestrator template/contract review; SA1 cross-review at MS18c |
| Status | Ready for serial dispatch; readiness and changed-winner handoff settled below |

## Goal & business context

Check whether the completed technique catalogue changes either measured choice before final
qualification. This task measures; it cannot retune the release candidate itself.

## Scope and repository rules

In: repeat both fixed experiments, apply their selection rules on paper, report decisions;
task-owned launch, bookkeeping and selection/report helpers.
Out: production/permanent measurement-tool/default/fixture edits, new acquisition or
qualification before any required owner decision.
AGENTS/checklist; no Git/pack/log writes.

## Accepted baseline and required reading

MS18a is accepted at **`484b8a52`**. Read `docs/difficulty-v3/after-2026-11-18.md`,
`evidence/MS18a/evidence.md` sections 9-10, `comparison-tables.md`/`comparison.json`,
the actual ledgers and **`helpers-sha256-q3.txt`**. Its final reporter fixes the commit
display and selects the transcript of the attempt that actually ran the payload.
Do not copy a superseded reporter or count a held attempt's transcript as a measurement.
The orchestrator independently recounted the rows, reproduced 24 Normal rows in separate
validation runs and passed the CI check; those repeats are not extra GS population rows.

- **17/17 cells, 204/204 outcomes**, 32 completed payload commands, 159 reporter checks.
  Exact **91 -> 163/204** (excluding old vacuous Hell 1, **79 -> 163/192**), in band
  **202 -> 204**, shallow **111/202 -> 41/204**. There are no admission gaps.
- Three default-setting cells are **0/12 exact, 12/12 shallow, eight attempts each**:
  classic9 Hell 1, Killer Hard and Killer Expert. Their disposition is specified below.
  The non-vacuous exact loss is `greaterThan:expert:0`; the other twelve lost old hits
  were vacuous Hell 1. Generation **128.81 -> 828.43 s** is descriptive, not a GP verdict.
- Runtime, diagnostic tool, quick and E identities are unchanged. MS18a's accepted
  commit also contains evidence, notes and helpers: do **not** repeat its pre-commit
  statement that the final `484b8a52` diff outside `tasks/` is empty. Verify the actual
  runtime/tool/fingerprint inputs, and retain actual commit/dirty metadata.

| Surface | Accepted identity / baseline |
|---|---|
| Generator quick | **4,784 / 55 suites**, 542.0 s; `274067a0beb67a595f711be792ed2625193d2549ee8ec9a8bfc795cc8ef73b3c` |
| Player quick | **2,981 / 32 suites**, 117.2 s; `5e55cec60307ec6c0d4235d5e07b63934cabb4f1fe077da40b99277e5576d14c` |
| Replay E | `ff55cbce4c34034d501ee495417e7c69da953143c9f74a4bae4f5b722d719421` |
| Hash E | `b1c78ecbcf3a0e4bb0d6a1f661f235e5f9ce63e4b3756dc3260892ac19270a58` |
| Soak source | `85537bbd28702233722e448d36d87f5faf445ca25668b1926e8ffb22f4b93c3a` |
| Soak tool | `efff9dcd558e04dc17df7ba0a5778da35006b116d8ebca2bcda248ff3012b3c7` |

Quick evidence remains MS17b's `quick-final-2/` for Generator and
`quick-final/player-quick.json` for Player. Projections stay **170/70/70/50/330/30/80/90**
for core-shared/steps/replay/mega/own-fast/digger-target/pipeline/Generator player,
and **180** for the Player job. Rating/cache **3**, history/worker wire **1**, grouped
proof **2**, catalogue/GH **40** (34 unscoped) stay unchanged. Verify identities, not
repeat E/GH/GD/quick sets or change CI merely because this evidence task runs.

Read R5/R9 in `docs/difficulty-v3/report-detailed.md`,
`shallow-cap-2026-11-13.md`, `chain-window-2026-11-15.md` and `limits-v3.md`.
Only the latter's section 1 new-pattern limits are frozen with the version. R5 **256**,
C **4**, attempts **8/4/2** and existing dig bounds are recorded separately; this task
does not tune any of them or inherit an unused introducing-task adjustment.

## Readiness contract — explicitly authorized for MS18b

**MS18b-host-active** renews the accepted MS18a Q1/Q2 operational contract for this
task before any measurement. This is explicit authorization, not automatic inheritance
of its task-only exception. It settles MS18a-Q1-HOST and MS18a-Q2-ADMISSION for this
dispatch; their original failures, holds, attribution limits and audit history remain.
No new owner pause question, per-service exemption or recurring QUESTION is needed for
an ordinary eligible CPU hold handled as follows.

- Obtain the orchestrator's **explicit shared slot/resumption**, not an inferred grant
  from task assignment. Pentomino is stopped; the other Copilot host PID **17588**
  is idle, not exempt. Verify this session's host **PID 1968**, creation time
  **`2026-11-13T19:26:33.6916441+07:00`**, against the confirmed instance/name/ancestry
  observations recorded by MS18a. A changed/unverifiable instance requires QUESTION,
  not a new PID guessed from the process name.
- Keep both mutex checks, the post-acquisition screen and pre-payload lock recheck.
  Record five one-second aggregate CPU intervals and the original **mean <=0.5 /
  max <=1.0** strict-screen verdict as `ready`, separately from named-policy `admitted`.
  A raw numerical failure alone does not block this task under verified admission.
  Every timing is **"shared-slot, CLI-host-active; not strict-quiet-machine timing"**,
  including runs whose strict screen happens to pass. No CPU subtraction/normalization
  or claim that all aggregate CPU has been attributed to PID 1968.
- Keep Q1's verified host/process observations and **>=0.5 CPU-s per elapsed second**
  additional-consumer hold over the actual snapshot window. No `svchost`/InventorySvc,
  OS-maintenance, all-`copilot` or host-descendant exemption. Identified launcher/sampler
  processes are instrumentation; concurrent generation/tests by another agent are not.
  A known foreign computational job is a hold even if caught idle. Unavailable counters
  are not zero; required identity/counter/evidence failures remain stops.
- For a verified ordinary additional-consumer hold only (fresh matching exit 3,
  `admitted:false`, payload unstarted, no puzzle ledger, all hold reasons eligible),
  allow **one fresh-slot re-ask**, at least **60 s after release**, outside all locks.
  At most **two admission attempts per fixed logical experiment entry**, across driver
  calls/restarts; no third attempt, no quota reset by renaming/replanning, no live
  no-op checks to hunt for a passing window. Keep >=15 s between ordinary acquisitions
  and the existing foreign-release settling condition. Retain distinct immutable
  attempt paths, a stable entry/ordinal mapping and the unchanged payload/ledger path.
- A second eligible hold becomes an explicit unexecuted gap; continue other safe
  entries without another QUESTION for that recurrence. Report the batch incomplete
  even if a later child exits 0. No fabricated miss/error rows or winner from incomplete
  data. A purported hold after payload start, actual payload failure/timeout,
  mixed/unknown hold reason, identity or evidence defect keeps its existing
  stop/routing rule; this is not a payload retry.

MS18a had **24/32** executed commands fail the raw strict screen and only **two**
additional-consumer holds, both resolved at attempt 2 (PIDs 10948 and 3640, 0.66 and
0.59 CPU-s/s). Nothing was rerun and no gap remained. These observations justify reusing
the operational contract, not predicting that every MS18b admission will pass.

### Helper reuse requires experiment-aware identity

Adapt the accepted **`admission.cjs`, `attempts.cjs`, `drive.cjs`, `run-entry.ps1` and
`run-locked.ps1`** into `generator/tests/artifacts/difficulty-v3/MS18b/`, with this task's
policy name/paths and a fresh attempt log. Do not edit MS18a's accepted files or use
its legacy first-hold-stopping `run-gs.ps1` as the Q2 sequencer.

**Do not copy `attempts.cjs`'s `payloadKey`/`sameSpan` unchanged.** It keys only variant,
level, from and count, sufficient for MS18a but wrong here. Derive and validate identity
against the plan from **experiment family, setting, variant, level, seed, absolute span
and logical total 12**, including the other effective default/source configuration.
Exactly one of `--shallow-cap` / `--chain-window` identifies this experiment; both or
neither is invalid for this task's fresh comparison rows. Different settings/families
are legitimate distinct entries, not aliases; a renamed entry with the same full
configuration must still consume its existing quota. Keep settings out of each other's
attempt history, output paths and merge inputs.

Use the Q3 reporter's successful-attempt transcript selection and explicit commit list,
not the pre-Q3 display logic. Test adapted admission/control flow and selection with
fake data, including same span at different cap/window settings, renamed duplicates,
held-then-admitted, twice-held plus later success, payload-start/nonzero stops, R5's
upper median and no-eligible case, and C's tie-to-6 rule. Format/freeze owned helpers
before generation; preserve later revisions and affected metadata without retagging
earlier records. No extra live admission self-test is required.

Write/read back each bounded phase plan before dependent work. **S-OD12/S0** grants
no corpus/seed search or new acquisition route. Any genuinely unresolved decision
still triggers QUESTION before acting and pauses new edits/runs. The known host,
ordinary CPU holds and the changed-winner reporting path below are already settled.

## Inputs & context

R5, verbatim:

> If the rule then selects another value than the one in force, MS18 stops before GQ-final and the
> orchestrator asks the owner: keep the value, or insert a task that changes it and re-runs GG, GR,
> GH and GD before MS18 resumes. MS18 changes no generation or solver logic or tuning constant.

| Experiment | Cells | Settings | Fixed other default | Outcomes |
|---|---|---|---|---:|
| R5 cap | classic9 normal/master/nightmare; killer hard/expert; jigsaw9 expert | **64, 128, 256, none** via `--shallow-cap` | **C4**, no `--chain-window` | 6 x 4 x 12 = **288** |
| R9 window | classic9/diagonalX/jigsaw9 nightmare | **C4, C6** via `--chain-window` | **R5 256**, no `--shallow-cap` | 3 x 2 x 12 = **72** |

**Thirty logical comparison cells, 360 fresh outcomes.** R9 explicitly requires fresh
requests; MS18a is context for bounds/consistency, not retagged or reused comparison
rows. Each setting has absolute indexes **0..11**, base **20260101**, original tags and
routes: classic9/diagonalX direct, Killer/Jigsaw pipeline with derived `seedFor` seeds.
All boards have 81 cells: retain board-default attempts **8** without an explicit
override, the reference endpoints **0/11**, budget **120000 ms** and the existing checks.
No new pilot population, Hell 1/G13/mega diagnostics, weights/bands, attempt dimension
or combined cap/window override. `none` is **Infinity for the extra local allowance**,
not removal of the 1024/32768/64/200000/100000 existing guards.

For each logical cell/setting, validate current ledgers and use
`SG.fixtures.difficultyDiagnostics.mergeShards`; there is no soak `--merge` CLI.
Reject mixed source/tool/Node/effective settings, gaps and duplicates. Aggregate raw
rows, not shard medians/percentiles. Retain each `summary.checks`, transcript, actual
status and work conservation result; `--no-gate`/exit 0 does not certify correctness.
A captured request error/timeout is a miss in its fixed twelve, with its actual work
when available; it is not erased or retried. Invalid puzzles/flags/counters still stop.
A killed/missing payload is **unexecuted/incomplete**, not a fabricated error outcome.

**R5's exact rule:** for each finite cap, every cell's exact count must be **>= none's
count**, and at least one cell's **upper median of `row.fullRatings`** must be strictly
smaller than none's. Use all twelve requests/all attempts, sorted index **6** (zero
based), not the exact-only cohort, an average of the middle two, local/shallow ratings
or milliseconds. Choose the **smallest** eligible finite cap; if no finite cap qualifies
on complete valid evidence, choose **none**. Per-cell count comparison is the rule,
not preserving each particular exact seed; still disclose matched losses/gains.
Missing work is unavailable, not zero. Incomplete evidence means **no determined
winner**, not the legitimate measured winner `none`.

**C's exact rule:** sum exact hits over the three twelve-request cells. More wins;
**C6 on any tie**, including 0/36 versus 0/36. Per-variant counts/shallow outcomes and
timings remain visible; neither a timing advantage nor a preference to retain C4 can
override the rule. A tie selecting C6 is a changed winner and requires the owner.
Hits are canonical `generationExact === true`, with diagnostics checking flag/derived
verdict consistency; score-only in-band and shallow outcomes never become exact hits.

Verify anchors at `484b8a52` (unchanged from `57c1b10`): `soak.js:428` (`seedFor`),
`:439` (`generateOne`), `:490` (`checksNow`), `:537` (generation timer), `:875` (`metaOf`);
`fixtures/difficulty-diagnostics.js:225` (`summaryOf`) and `:619` (`mergeShards`).

### Zero-exact cells: measured inputs, not a new task

**Keep Killer Hard/Expert in every R5 setting**: their 0/12 at the default does not
remove them, pre-assign zero at `none`, or disqualify an otherwise eligible finite cap.
If both a finite cap and none have zero in a cell, that cell has no hit-count loss;
a valid work-median reduction there may satisfy the literal work predicate, provided
every other cell also meets the no-loss test. Do not invent a minimum-hit requirement.
Measure and report, including twelve shallow/eight-attempt outcomes where observed.

**Classic9 Hell 1 is in neither fixed experiment.** Carry its 0/12 result and S-AV25,
but add no Hell 1 probe, cap experiment, seed search or tuning. All three cells'
availability/offer consequences belong to **MS18c**, not this twelve-request comparison.
Killer Hard/Expert also retain **S-OD7**: hidden until later calibration, no in-v3
weight recalibration; keep them in full final GQ and distinguish owner withholding
from the raw qualifier verdict. No interim support-list edit or owner question follows
merely from these zeros. A genuine changed R5/C winner still follows the separate rule.

## Changed-winner report and precise stop

Run both preplanned, credibly bounded experiments with the **production defaults still
256/C4**. If the first completed experiment selects a change, the other independent
experiment and read-only report may still finish under those unchanged defaults.
Do not raise a mid-matrix QUESTION solely for this anticipated handoff, install the
provisional R5 winner for the C experiment, or test a combined proposed pair.

The final decision packet must contain:

1. Complete/intended **288+72** coverage, missing/error/held indexes if any, source/tool/
   Node/default identities, actual admission/exit/diagnostic status and evidence paths.
2. The **24-row R5 table**: setting/cell, exact/12, in-band/shallow/errors, upper median
   full ratings, work/cap/attempt counts and descriptive time. For each finite cap,
   show all six hit-count differences against none and each strict-median predicate;
   list eligibility and the exact reduction witness(es). Report current **256** versus
   the computed winner, or undetermined with the precise missing evidence.
3. The **6-row C table**: each variant at 4/6, exact/12, shallow/errors/work/time,
   totals **/36**, comparison/tie and rule-selected C. Report current **4** versus
   computed winner; tie-to-6 is explicit, never rewritten as reconfirmed C4.
4. A disposition table for **each choice (R5 and C)**: `in force`, `rule winner`,
   `same / owner decision pending / undetermined`, and the cumulative item list.
   The one-factor results do not prove the joint behavior of two changed defaults.

**If both rules reconfirm 256/C4:** report reconfirmation for orchestrator acceptance;
no owner question is needed for the zero-exact cells alone. Only after MS18b acceptance
may MS18c be dispatched.

**If both experiments are complete and either selects a different value:** finish the packet and
stop at **"measurements complete; owner decision pending"**, before any default change,
GQ-final/MS18c dispatch or related production/evidence refresh. The orchestrator asks
the owner, separately for each changed choice:

- **A — keep the current value**, recording the measured winner and the owner's
  explicit keep decision separately; do not relabel the computed winner as the default.
- **B — insert a separate implementation task** to change the value and re-run
  **GG/GR/GH/GD** before MS18 resumes, with the normal coupled quick/E/doc gates and
  replacement of affected final evidence. Existing MS18a/b results stay historical
  if invalidated; no old/new identity mix or automatic repeated tuning loop.

The developer neither obtains/invents the owner's answer nor implements option B.
If data is incomplete, report **undetermined / incomplete milestone**, not a winner
or a spurious keep/change choice based on missing outcomes. Continue other safe
measurement/report work under S-OD4, but no complete selection or GQ handoff is claimed.
Keep a completed experiment's valid winner visible; a changed one still needs the
owner, but neither a decision on it nor its valid data completes the other experiment.
Correctness or any genuinely unresolved contract still stops immediately under QUESTION.

**Discord question template (fill only with complete validated selection data):**

> MS18b đã đo đủ 360 lượt. R5: hiện tại 256; quy tắc chọn {R5}; chênh lệch số exact theo
> từng ô so với none: {số liệu}; điều kiện trung vị full ratings: {ô: trước -> sau / không đạt}.
> C: hiện tại 4; C4={H4}/36, C6={H6}/36; quy tắc chọn {C} (hòa chọn 6).
> Chưa đổi mã; GQ-final dừng chờ quyết định. Với từng mục thay đổi, chọn A giữ giá trị
> hiện tại, hay B chèn task đổi sang giá trị được chọn và chạy lại GG/GR/GH/GD cùng
> dữ liệu cuối bị ảnh hưởng trước khi tiếp tục? Bằng chứng: {đường dẫn}.

## Inherited items and handoff

Carry the full check-list register and MS18a's item table; none is closed by a small
cap/window sample. Preserve source, population and current disposition in the report
**and final reply**, including these explicit handoffs:

| Item | Status / next owner |
|---|---|
| MS18a-Q1-HOST | 24/32 executed raw screens failed; host/system attribution incomplete. Readiness settled here by explicit renewal; descriptive label persists. MS18e audit; no GQ/GP waiver. |
| MS18a-Q2-ADMISSION | Two ordinary CPU holds, both executed at attempt 2; 0 gaps, 0 payload reruns. Bounded rule renewed here; preserve both old attempts. MS18e audit. |
| S-AV14 | MS17b Normal aggregate **83/100**, failed; distinct from MS18a's 11/12. MS18c availability, MS18e GD/audit. |
| MS17b GD Hell 1 / S-AV25; confusion / S-AV15 | **8 tests / 20-request batch** and **1 test** unexecuted, stated bounds **919 / 1544 s**, not current-source measurements/passes. MS18c/d handoff, MS18e GD. |
| MS17b-GD21-PROCESS | Unlocked 36.5 s diagnosis/unsaved raw output and bisect IR12 defects; not protected timing. MS18e audit. |
| S-AV36-S-AV39 | Keep construction, seeded/blank, repository and whole-generation populations distinct, including MS16's extension. Limits unchanged; MS18c availability, MS18d cost, MS18e audit. |
| MS15b-GP-J / MS15b-GP-U | Of **37** cells, one full record, Jigsaw Nightmare pilot only (**680 s** 50-run projection), **35 unmeasured**; not S-AV38's 50-cell population. MS18d/e. |
| MS15b-Q6 / MS16-Q6 | Controlled placement coverage and fixed seed-377 lineage/pause disclosure, not acquisition permission. MS18e audit. |
| MS18a zero-exact/loss record | Hell 1 and Killer Hard/Expert **0/12** each; non-vacuous loss `greaterThan:expert:0`; no new scope here. MS18c/d/e with the existing S-AV25 and Killer dispositions. |
| Earlier S-AV01/CV6-05, S-AV05/06/S-OD7, Q-MS07e-2, S-AV18-S-AV23, S-AV31/S-AV33/S-AV34 and standing quick cost | Keep every existing disposition and its distinct population; no recalibration, historical relabelling or inferred closure. Existing final owners in the check-list. |

Name any new held/unmeasured population or actual cost/availability finding under
MS18b with its numbers and next owner. The explicit current-task readiness renewal
does not authorize its use in MS18c/MS18d before their dispatch contract is settled.

## Files to create/modify

- Evidence/MS18b and task-owned helpers under `generator/tests/artifacts/difficulty-v3/MS18b/`.
- Append final-recheck sections to the two named cap/window records, preserving their
  historical measurements/results; notes and limits-v3 evidence links/disposition only.
- No production-default/measurement-source, generated expectation, support-list or task-pack change.

## Implementation steps

1. Verify the accepted source/defaults/identities and both full manifests. Plan/read back
   phases, adapt/test the experiment-aware helpers, format/freeze, then obtain the slot.
2. Run distinct per-family/setting/shard paths under the explicit readiness contract;
   verify 288+72 outcomes, raw diagnostic status and complete checked per-cell merges.
3. Recompute both literal selection rules from raw rows and assemble the decision packet.
4. Follow the precise stop above. Only the orchestrator obtains the owner's keep/change
   decision and inserts implementation/refresh work; no provisional setting is installed.
5. After reconfirmation/recorded decision, hand qualification the final candidate identity.
6. If final ordinary-sample cost suggests a sample-level bound, report data as its own proposed
   decision. S-OD4 does not authorize implementing that bound here or silently changing what R5 measures.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18b-B01 | The complete catalogue cannot silently invalidate an earlier measured choice |
| MS18b-B02 | A new winner never becomes an unauthorized late retune |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18b-T01 | Exactly 360 outcomes, same request identities and isolated overrides |
| MS18b-T02 | Both deterministic rules, ties, errors and work medians applied literally |
| MS18b-T03 | Changed choice blocks GQ until recorded owner action; no source edit here |
| MS18b-T04 | Named host-active admission, persistent experiment-aware attempt quotas and immutable attempt records; gaps never become winners/passes |
| MS18b-T05 | Zero-exact cells retain their assigned population/disposition; complete inherited/new item list and an explicit per-setting decision status |

## Test plan and gates

Generator:

```powershell
node tests\soak.js --variant=classic9 --level=normal --count=12 --seed=20260101 --no-gate --shallow-cap=64 --json=..\docs\difficulty-v3\evidence\MS18b\cap-64\classic9-normal.json
node tests\soak.js --variant=classic9 --level=nightmare --count=12 --seed=20260101 --no-gate --chain-window=4 --json=..\docs\difficulty-v3\evidence\MS18b\window-4\classic9-nightmare.json
```

Repeat all cap cells/settings and window cells/settings. Jobs 1/no --jobs. The historical
1-5-hour total is planning context, not a launch bound. Each complete command, including
any in-command readiness check, needs a credible <=450 s projection and retains the
540-second process-tree ceiling. Use existing absolute-index shards where necessary,
keeping `--total-count=12`, distinct setting identities, original routes and reference endpoints.
Use MS18a's current-source per-request work/timings as a basis, not its old blanket
bounds or its maximum command time for every setting. **None and C6 can change search
paths/cost**; do not copy the default-setting bound without a justified margin/basis.
Include I4's repeated generation at absolute indexes divisible by 5, startup/readiness,
all checks and deferred reference/path work. An existing setting's measured non-binding
cap may inform a stated bound, not a universal four-times-cost assumption.
If even an existing one-request shard cannot be credibly admitted, keep the exact
unexecuted population and continue safe work; no new slow-cell tooling or unsafe probe.
Announce/read back the plan, obtain the shared slot and record each admission/attempt.
Evidence-only; no new application test or blanket hash rewrite. Incomplete evidence blocks the milestone.

## Definition of done & handoff

Return the complete decision packet, winner/default pairs, raw records, per-cell losses/costs,
readiness dispositions and the full item list. State **reconfirmed**, **owner decision pending**
or **undetermined/incomplete** explicitly; acceptance is not implied by producing the packet.
If an inserted implementation task changes the candidate, replace stale affected final evidence
before qualification rather than mixing source identities.

## Resume rules — S-OD4

Review: orchestrator template/contract review, not routine analyst cross-review.
A changed selected cap/window needs the recorded owner decision before
GQ-final; correctness/evidence corruption also stops. Mere time/availability findings are named
numerical MS18c/MS18d items and other bounded work continues, not an automatic tooling task.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, with existing exact-index shards.
Return the inherited/new item list and explicit keep/change decision status; no suite/CI edits here.
The settled host-active and eligible-hold branches above need no repeat QUESTION.
No permission here carries to a new acquisition route, changed selection rule or final GQ/GP waiver.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (evidence only; orchestrator template/contract review, SA1 cross-review resumes at MS18c). Both rule winners equal the values in force: **R5 256 and C = 4 reconfirmed**, so no owner decision is needed. Complete coverage 288 + 72 = 360 outcomes; no QUESTION was raised; the MS18b-host-active readiness contract was applied with 0 holds |
| Start | 2026-11-18 19:20:23 (+07:00), base `393775a1` (pack-only on accepted `484b8a52`; production/soak bytes = MS17b `57c1b10`); explicit shared-slot grant in the dispatch |
| End | Locked commands 19:46:15-20:49:07; final report 20:55:27; orchestrator review 20:56-20:58 (locked re-runs about 20:57); commit about 20:59 |
| Duration | About 1 h 35 min developer (no question waits); orchestrator review about 3 min; 44 locked commands in `docs/difficulty-v3/evidence/MS18b/lock-log.jsonl`, largest at most 0.478 of its bound, smallest gap between locks 15.010 s |
| Model | claude-sonnet-5.5 (developer); gpt-6-astra (SA2 preparation); claude-opus-5.5 (orchestrator) |
| Token usage | Developer: 160 model calls; 61,301,067 input tokens (60,681,740 cache reads); 277,291 output tokens. SA2 preparation (19:05-19:19): 12 calls; 3,198,524 input (3,141,672 cache reads); 34,377 output |
| AI credits | about 1,039 (developer); about 768 (SA2 preparation) |
| Verification | Developer: 30 logical cells (R5 6 cells x 64/128/256/none; R9 3 Nightmare cells x C4/C6), 360 of 360 outcomes, every command exit 0 with DIAGNOSTICS PASS; helpers task-owned, tested without generation (47/47, 64/64, 53/53; r1 reporter 59/59), frozen `helpers-sha256.txt` before the first timed command and `helpers-sha256-r1.txt` after the reporter revision (same result on the same ledgers); host PID 1968 creation time verified, PID 17588 no exemption; six fingerprints identical at start and end (Generator `274067a0...`, Player `5e55cec6...`, replay `ff55cbce...`, hash `b1c78ecb...`, soak source `85537bbd...`, tool `efff9dcd...`); 256/C4 rows reproduce MS18a puzzle hashes 72/72 and 36/36 (informational). Orchestrator: independent recount from the 44 raw ledgers (360 unique tags, indexes 0..11 in all 30 cells, 0 errors, per-cell exact/shallow/upper-median full ratings equal to the developer tables); R5 rule re-derived (64 loses classic9 Normal 11->10 and Nightmare 12->11; 128 loses Normal 11->10; 256 loses none and lowers Jigsaw 9 Expert 1,215 -> 1,104, so 256 is the smallest eligible cap); C rule re-derived (36/36 vs 20/36, no tie); locked re-runs of the two decisive cells cap-128 classic9 Normal (4.1 s) and cap-64 classic9 Nightmare (21.7 s) reproduce 24 of 24 rows (10/12 and 11/12 exact); `git diff 484b8a52` outside `tasks/`, `docs/` and `generator/tests/artifacts/` empty; `limits-v3.md` edits confined to section 3/5 recheck records (section 1 untouched); CI `generator-suites.sh check` passed (4,784 of 4,784) |
| Acceptance | MS18b-B01, B02, T01-T05 met (developer evidence `docs/difficulty-v3/evidence/MS18b/evidence.md`, AC mapping section 4; final-recheck sections in `shallow-cap-2026-11-13.md` and `chain-window-2026-11-15.md`; disposition in `limits-v3.md`) |
| Issues & resolutions | R5 table (exact/12, upper median full ratings; classic9 Normal, Master, Nightmare, Killer Hard, Expert, Jigsaw 9 Expert): none 11/66, 12/4, 12/49, 0/581, 0/2314, 11/1215; 256 11/66, 12/4, 12/49, 0/581, 0/2314, 11/1104; 128 10/66, 12/4, 12/49, 0/570, 0/2314, 11/754; 64 10/66, 12/4, 11/49, 0/503, 0/2255, 11/434. C table: C4 12+12+12 = 36/36, C6 2+12+6 = 20/36. Killer Hard/Expert 0/12 exact, 12/12 shallow at every cap (S-OD7, MS18c). Generation time over the six R5 cells 371.4 / 388.6 / 410.9 / 423.1 s at 64/128/256/none; C6 about 3.8x C4 (descriptive, host-active). Admission: 44 of 44 admitted at attempt 1, 0 holds/re-asks/gaps/reruns; raw strict screen failed 40, passed 4. Developer disclosures: unlocked actions limited to file-only preparation and two reporter runs (20:33 dry run on partial data, final run); reporter revision r1 (trailing space; incomplete evidence exit 4 instead of 1) refrozen. Gaps: twelve requests per cell, no repeat, no strict-quiet pass, so no GQ/GP conclusion |
| Handoff | To MS18c: R5 256 and C = 4 reconfirmed on accepted source (no owner decision); unchanged accepted source, quick totals (Generator 4,784, Player 2,981), fingerprints and projections from MS17b; MS18b host-active readiness executed (0 holds) - readiness for MS18c/MS18d must be settled in their own dispatch contracts; new MS18b items (R5/C reconfirmed, Killer Hard/Expert 0/12 at all four caps, R5 and C6 cost observations) to MS18c/d/e; inherited items MS18a-Q1-HOST, MS18a-Q2-ADMISSION, S-AV14, S-AV25/S-AV15 (GD Hell 1 and confusion matrix), MS17b-GD21-PROCESS, S-AV36-S-AV39, MS15b-GP-J/GP-U, MS15b-Q6, MS16-Q6, MS18a zero-exact/loss record and earlier S-AV items unchanged |
