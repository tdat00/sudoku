# MS07e — First complete qualification checkpoint

| Header | Value |
|---|---|
| Depends on | MS07d accepted; selected cap/cutoff recorded |
| Size / active time | Small; 25-40 minutes plus full gate collection |
| Owner / milestone | Evidence; M7 first checkpoint, no pruning |
| Authority | R24/R9/R21; PROC-S1, AUTH-S1 |
| Status | Not started |

## Goal & business context

Measure requiredness and split-chain availability before S3 adds the missing proofs. A hidden
checkpoint level is evidence, not permission to remove it yet.

## Scope

In: all 135 GQ-first cells, full GG check, GD, truthful checkpoint record and accumulated item review.
Out: live table/support-list changes, tuning, solver/generator edits or calibration.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. Never two heavy runs on this machine. A worker/evidence
failure is correctness; a cost-bounded incomplete cell prevents a complete-checkpoint claim but
becomes an S-OD4 item, not an owner stop or an invented hidden verdict.

## Inputs & context

R24, verbatim:

> The first checkpoint records correctness and availability evidence, but does not permanently
> prune levels before S3 can add the missing proofs. Soundness failures block progress; measured
> intermediate availability shortfalls are recorded as such, not relabelled green or fixed by
> weakening requiredness.

Checklist Q is the fixed 15x9 manifest. Use jobs 4, default selected settings, qualifier seed base
20260601, 40/100 protocol and 120000 ms request guard. Use r5p size defaults, never explicit 8.
No diagnostic overrides or --probe.
MS07d merge checks all metadata/requests; current offered lists do not restrict the matrix.
Resume anchors at c9935cd: `qualify.js:143,186` (`child`, `hitOf`), `:223` (`decide`),
`:320` (`certain`); MS07d adds the merger. Use stable symbols after it.

### PR-S2 remarks — existing evidence, unchanged scope

Fable's answer in `92a7693`, now in `docs/difficulty-v3/clarifications-resolved.md`, confirms the
remaining route at that review; CV6-05 subsequently sets MS05e aside and clarifies sign-target
transport. `docs/improve-generating/plan.md` is a later feature requiring separate authorization,
not work or a new prerequisite for this checkpoint. No new cap, budget or scope is added.

- **Existing request counters:** where this task already writes per-request records, keep the
  existing `stats` counters, including `samples`, `attempts` and `oracleCalls`, alongside the
  request/source/default identities. Preserve available values through the existing recording/
  merge/handoff path; do not strip them in favour of only times and hits. Keep their actual counting
  scope and any unavailable value explicit, not zero or an invented whole-request total. This
  retains existing telemetry for the later improvement baseline; it adds no instrumentation project.
  Qualification shards currently lack `stats` (MS07d): report samples, actual attempts and
  oracleCalls as unavailable, not zero; a cell's `attempts` is the configured maximum, not observed
  attempts. Preserve separately sourced soak counters without backfilling qualification rows.
- **S-AV03 wording:** the reviewed mega16 Nightmare search fails the 30 s budget by its work ceiling,
  not as a tail. Keep that finding source-qualified when comparing it with this checkpoint.
- **S-AV11 attribution:** keep the Jigsaw 325 s request's stage/cause unassigned until MS18d's stage
  profile. Do not describe it as a dig cost or add a new profiling run to this checkpoint.

### First checkpoint decisions and proposals (PR-S1 / S-OD4)

Reconcile every inherited/new item, including S-AV01 CV6, large-board Nightmare/hell1,
classic9 Nightmare, Killer Hard/Expert and per-app quick cost. Report their current source,
exact hits/denominators, p95/guard/projection, limits and evidence. Keep historical numbers
separately; do not claim S3 has already repaired a cell.

- **CV6-05 handoff:** MS05e is closed "measured, set aside", with the first-allowed sign pass
  restored by identity. S-AV01 remains open: 5,209 ms against 1,400 ms on CV6's Normal seeds
  and 10.6 s p95 on 7000-7039. Keep the 700 ms base, unchanged GP rules and current offers;
  no assertion edit/skip/wrapper or interim pruning. Record this checkpoint's own source/data,
  then carry S-AV01 to MS18c/MS18d under the three fixed endings in checklist section 2.
  S-AV16/S-AV17 are withdrawn as current-source items; keep their rejected-pool observations
  as history. S-AV08's restored quick baseline is 648.0 s, not the candidate's 726.2 s.
- **Greater-Than Nightmare CV6 margin (CV6-05):** the restored-source observation is a pass at
  19,192 ms of 20,000 ms, only about **4% margin**. MS07's chain work will move it; this is
  not a current-source upper bound or a qualification result. If it fails later, the task
  that moved it records a new named item with its source and actual numbers, not a revival
  of the withdrawn pool's S-AV16. This note does not add another experiment or change a budget.
- **Killer Hard and Expert:** report both individually. R5 found 0/12 in each at every setting.
  Their tier is cageSplit/fish and their band is often reached through ruleOf45 work; Fable does
  not expect S3 to fix that weight problem. If the checkpoint classifies either cell hidden,
  ask the owner whether Killer weights are recalibrated **inside v3** or those cells stay hidden
  until later calibration. Send the measured question to the orchestrator/SA2 for a numbered
  clarification; no weight change or new calibration task before that answer. Continue all six
  S3 groups in the meantime, with live offers unchanged.
- **Quick-set cost:** if r6b/current evidence leaves Generator above about five minutes, propose
  the concrete generation-heavy quick keys that should move to the manual tier. Name current
  shards, per-case/process times, preserved requests/assertions, proposed manual owners and CI
  consequences. This is S-AV08, not a stop or automatic permission to move tests. Orchestrator
  forwards a decision request if the proposal would change the recorded quick contract.
- **Large boards:** report checkpoint-hidden Nightmare/Hell cells under (c1), not a new waiver.
  If the owner wants them offered, Fable's route is a separately decided large-board speed task
  after S3 and before MS18c, not higher budgets or weaker exactness. Do not invent that task here.

Route unresolved availability to MS18c, cost/CV6/GP to MS18d; every item remains visible in final
replies and MS18e's audit. No new evidence class/tooling task for a slow intermediate cell.

## Files to create/modify

- `docs/difficulty-v3/evidence/MS07e/`; new
  `docs/difficulty-v3/qualification-checkpoint-2026-11-12.json` and `.md` (actual date if later);
  v3 notes.
- No engine, variant, live qualification table, historical report or expected fixture.

## Implementation steps

1. Record source/defaults, machine/Node/jobs and the exact matrix. Read MS07b's non-vacuous Hell 1
   pilot, or MS07c's replacement if C changed; report its per-request and projected 20-request
   GD times before scheduling the Hell 1 batch. It is an estimate, not current gate evidence.
2. Run one bounded complete cell at a time; keep failed attempts separately, never invent a row.
3. Merge only complete validated cells; publish checkpoint-only records.
4. Check the full hash corpus against current expectations and obtain complete GD coverage once
   through the checklist's bounded group/level shards.
5. Complete the item reconciliation and Killer/quick-set actions above. Report any slow uncompleted
   population explicitly and continue; never publish an incomplete merged qualification as complete.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS07e-B01 | The next solver work receives honest checkpoint outcomes and every named incomplete/availability item |
| MS07e-B02 | No level is removed before the missing techniques are implemented |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS07e-T01 | All 135 cells accounted for at jobs 4; only complete protocol-valid records merge, slow incomplete cells remain named items |
| MS07e-T02 | Full 520-key GG check and GD evidence; soundness/API failures block |
| MS07e-T03 | Live offers/table unchanged; both quick sets verified |
| MS07e-T04 | Killer Hard/Expert and quick cost are reported; conditional owner questions/proposals and all final item routes are explicit |

## Test plan and gates

**IR17 — classic9 GD Nightmare margin (recovery source `00647f9`).** The completed batch took
430.5 s: about 96% of the 450 s planning budget and 80% of the 540 s process ceiling.
Before any rerun, state a current-source projection and an explicit conservative margin for the
whole command, including startup and variability. **449 s is not a bound to reuse** or a value to
choose merely to fit below 450 s. If a credible projection with its margin cannot fit 450 s,
treat the unchanged batch as a population above 450 s: do not launch it, record the named
unexecuted-cost item and continue other evidence under S-OD4. Do not cut its request count or
raise a guard. This is the classic9 GD batch, not a 40/100-request qualification cell; the
accepted recovery run needs no retrospective redo.

Generator, first cell, then every Q cell with its own file:

```powershell
node tests\qualify.js --variant=classic4 --level=veryEasy --jobs=4 --json=..\docs\difficulty-v3\evidence\MS07e\qualification\classic4-veryEasy.json --markdown=..\docs\difficulty-v3\evidence\MS07e\qualification\classic4-veryEasy.md
node tests\qualify.js --merge=..\docs\difficulty-v3\evidence\MS07e\qualification --jobs=4 --json=..\docs\difficulty-v3\qualification-checkpoint-2026-11-12.json --markdown=..\docs\difficulty-v3\evidence\MS07e\table.md
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS07e\hashes\classic4-veryEasy-00.json
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS07e\hashes --check-hashes
Invoke-Dv3Node -Task MS07e -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=time) > nightmare >')
```

Complete E's 520 hash identities before merge; **check only**, never --update-hashes in this task.
Build the checkpoint narrative around the generated table, not by overwriting the live report.
GQ jobs=4, others jobs=1/no --jobs. GQ time (SA2 ruling after MS07d, S-AV27): for a possibly
expanding one-cell invocation, project first-round four-worker wall time **plus 60 serial request
times**, startup and a conservative variance margin, not 60/4. Use applicable source-qualified
timings; do not assume early stopping. Launch only with a credible <=450 s projection; retain the
540 s ceiling. Otherwise record S-AV27/unexecuted coverage and continue, without truncation, changed
jobs/guards or a complete-checkpoint claim. Document configured jobs=4 and the one-worker second
round. GG 10-90 minutes. GD uses checklist section 7's complete bounded manifest:
retain the first Nightmare shard and separately run/retain the Hell 1 batch early, then every
other offered-level/non-batch group exactly once. Project from the MS07b/MS07c pilot and actuals,
especially the now-nonvacuous Hell 1. If projected above 450 seconds, do not launch that callback;
record a named item and continue other evidence. Do not create another tooling task or lift
the 540-second ceiling. No single full-suite invocation
or assumed 1-8-minute ceiling is safe. Every selected group must have nonzero coverage.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Stop a command at the 540-second ceiling. A slow cell without an existing safe route is an explicit
incomplete item, not permission to truncate, change worker count or call --probe.
Known intermediate requiredness-related hit/median-time failures remain failed assertions in the
record and go to MS18c/MS18d; do not lower budgets or call GD green. Correctness/evidence loss blocks;
cost-caused unexecuted coverage stays explicit, not disguised as passing coverage.
Use `--filter=time) > hell1 >` for the separate Hell 1 command, exactly as for Nightmare, only
when it is in the recorded offered manifest. Do not count the two-request pilot as the unchanged
20-request manual batch or the 40/100-request jobs-4 GQ cell.
Use the shared lock for all gate/quick commands over 10 seconds. Both quick sets complete acceptance.

## Definition of done & handoff

Return complete checkpoint paths, observed offers without applying them, source IDs, gate times and
all inherited/new items, the conditional Killer question and quick-tier proposal. MS08 begins after
the orchestrator accepts correctness and the truthful handoff; performance-only items do not pause
the full remaining scope. A missing/corrupt record or unsound puzzle is not such an item.

## Resume rules — S-OD4

Review: orchestrator only. Correctness/evidence corruption or a recorded-decision change stops.
Time/availability continues as the named numerical items above, with final MS18c/MS18d routes.
Every possibly >10-second payload uses `Invoke-Dv3Node`, <=540 s; no new slow-cell evidence/
tooling class or blanket whole quick/manual run. Preserve jobs 4 for GQ and the current quick manifest.
Return the complete item list and conditional decision requests; no suite/CI edits in this evidence task.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (orchestrator review; evidence task, outside the analyst review set). Checkpoint **incomplete by the S-AV27 rule**: 129 of 135 cells have complete valid records, 6 were not launched (projection above 450 s); the merger rejects the folder only for `missing 6 of 135 cells`, so no merged record and no complete-checkpoint claim |
| Start | 2026-11-15 10:30 (+07:00) |
| End | 2026-11-15 14:15 (owner pause 12:22-12:59 for improve-generating, nothing interrupted); orchestrator re-check and commit |
| Duration | 3 h 7 min active (3 h 45 min elapsed incl. the pause); 289 commands, 4,414 s process time, 30 locked invocations (20 of them IR12 compounds), recorded lock wait 4,054 s (longest 561 s) |
| Model | claude-sonnet-5.5 (developer); claude-opus-5.5 (orchestrator) |
| Token usage | 252 model calls; 98,362,024 input tokens (97,249,001 cache reads); 300,096 output tokens |
| AI credits | about 1,551 (developer) |
| Verification | Source `8b70875` (MS07d), engine sources `029720df77c6c12a`, qualifier `c0ef0d25…`, C = 4, jobs 4, AMD EPYC 7763, Node v26.13.0. **GQ**: 129 cells, 4,311 requests, 3,794 exact hits, 0 errors, 0 invalid or non-unique puzzles; 89 cells offered, 40 hidden, one second round (wordoku/normal); `stats` unavailable in qualifier shards (reported as unavailable). Not launched by projection: mega12/hell1 556 s, mega16/nightmare 1,246 s, mega16/hell1 1,808 s, greaterThan/expert 919 s, greaterThan/hell1 3,957 s, butterfly/hell1 4,032 s; the launched cells cost 1,523 s against 11,645 s projected. **GG**: 520 keys once each, 0 changed (check only). **GD**: 154 of 154 classic9 `difficulty` tests once each, 152 passed, 2 failed on aggregate hit rate (Hell 1 0 of 20, needs 18; Normal 83 of 100, needs 90), 0 correctness failures; Nightmare batch 17.3 s, passing; confusion matrix executed for the first time, passed, 191.7 s. Extra existing CV6 selectors: Greater-Than Nightmare passed (24.1 s); Greater-Than Normal failed at p95 5,361.5 ms against 1,400 ms (S-AV01). **Quick sets** on the final tree: Generator 3,505/3,505 (692.1 s), Player 1,750/1,750 (33.5 s); CI check passes. Orchestrator: CI check, tree confined to the evidence folder, the two checkpoint files and `notes.md`, format check of 671 files |
| Acceptance | MS07e-B01, B02, T02, T03, T04 met; T01 met as written (all 135 cells accounted for at jobs 4: 129 valid records, 6 named cost items; incomplete checkpoint, no merged record). Live offers and table unchanged. Records: `docs/difficulty-v3/qualification-checkpoint-2026-11-15.json` (checkpoint-only, `complete:false`, `merged:false`) and `.md`; evidence `docs/difficulty-v3/evidence/MS07e/` |
| Issues & resolutions | Observed against current offers (not applied): 23 offered cells observed hidden (classic9 hell1; diagonalX easy, hell1; hyper easy, hell1; jigsaw9 hell1; killer hard, expert, master, nightmare, hell1; greaterThan master; samurai easy, hell1; sohei easy, hell1; butterfly easy; flower easy, expert, master, hell1; wordoku normal, hell1); none observed offered where hidden today. Items S-AV01 to S-AV30 reconciled in the checkpoint §8 (new S-AV28 Easy availability, S-AV29 Greater-Than Master time, S-AV30 mid-level shortfalls; S-AV25 confirmed: 0 exact in every executed Hell 1 cell). Disclosed deviation: IR12 compounds instead of one command per lock (accepted by the orchestrator). Owner requests raised: **Q-MS07e-1** Killer Hard 0/14 and Expert 1/14 hidden (weights inside v3 or hidden until later calibration); **quick-tier proposal** (four tests, 392.1 s of 692.1 s, to the manual tier; changes the recorded quick contract); optional **Q-MS07e-2** to SA2 (launching the six cells once under an amended rule). Forwarded by the orchestrator |
| Handoff | MS08 may begin (correctness accepted; performance items do not pause the remaining scope). Routes: availability to MS18c, cost to MS18d, all items to MS18e's audit. Standing quick cost 692.1 s (S-AV08) |
