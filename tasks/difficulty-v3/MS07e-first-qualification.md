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

In: full 135-cell GQ-first, full GG check, GD, merged checkpoint record.
Out: live table/support-list changes, tuning, solver/generator edits or calibration.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. Never two heavy runs on this machine. A worker failure or
incomplete cell blocks a complete checkpoint; a protocol-valid hidden verdict does not.

## Inputs & context

R24, verbatim:

> The first checkpoint records correctness and availability evidence, but does not permanently
> prune levels before S3 can add the missing proofs. Soundness failures block progress; measured
> intermediate availability shortfalls are recorded as such, not relabelled green or fixed by
> weakening requiredness.

Checklist Q is the fixed 15x9 manifest. Use jobs 4, default selected settings, qualifier seed base
20260601, 40/100 protocol and 120000ms request guard. No diagnostic overrides or --probe.
MS07d merge checks all metadata/requests; current offered lists do not restrict the matrix.
Baseline anchors: `generator/tests/qualify.js:141-171` (`function child` / `out.hit =`),
`:199-222` (`function decide`), `:306-365` (`function certain`).

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
5. Report correctness failures separately from measured availability shortfalls.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS07e-B01 | The next solver work starts from an honest complete checkpoint |
| MS07e-B02 | No level is removed before the missing techniques are implemented |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS07e-T01 | All 135 cells, jobs 4, exact protocol/source identity and complete merged requests |
| MS07e-T02 | Full 520-key GG check and GD evidence; soundness/API failures block |
| MS07e-T03 | Live offers/table unchanged; both quick sets verified |

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
especially the now-nonvacuous Hell 1. If its projected batch exceeds 450 seconds, stop before
launch for an orchestrator-assigned protocol-preserving bounded solution; do not lift the
540-second ceiling. No single full-suite invocation
or assumed 1-8-minute ceiling is safe. Every selected group must have nonzero coverage.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Stop a command at ten minutes. A slow cell needing a safe protocol-preserving split is an explicit
blocker, not permission to truncate, change worker count or call --probe.
Known intermediate requiredness-related hit/median-time failures remain failed assertions in the
record and go to MS18d; do not lower budgets or call GD green. Correctness/incomplete coverage blocks.
Use `--filter=time) > hell1 >` for the separate Hell 1 command, exactly as for Nightmare, only
when it is in the recorded offered manifest. Do not count the two-request pilot as the unchanged
20-request manual batch or the 40/100-request jobs-4 GQ cell.
Use the shared lock for all gate/quick commands over 10 seconds. Both quick sets complete acceptance.

## Definition of done & handoff

Return complete checkpoint paths, observed offers without applying them, source IDs, gate times and
any intermediate shortfalls. MS08 begins only after correctness and completeness are accepted.

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
