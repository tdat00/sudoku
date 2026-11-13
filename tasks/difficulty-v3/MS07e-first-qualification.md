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

### First checkpoint decisions and proposals (PR-S1 / S-OD4)

Reconcile every inherited/new item, including S-AV01 CV6, large-board Nightmare/hell1,
classic9 Nightmare, Killer Hard/Expert and per-app quick cost. Report their current source,
exact hits/denominators, p95/guard/projection, limits and evidence. Keep historical numbers
separately; do not claim S3 has already repaired a cell.

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
GQ jobs=4, others jobs=1/no --jobs. Planning allowance: 10-540 seconds/GQ cell, approximately
1-12 hours total; GG 10-90 minutes. GD uses checklist section 7's complete bounded manifest:
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
