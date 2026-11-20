# MS06a — Capture the isolated pre-target comparison

| Header | Value |
|---|---|
| Depends on | MS05e closed, set aside, identity proved (CV6-05); document corrections complete and SA1's pack cross-check recorded |
| Size / active time | Small; 20-30 minutes plus GS |
| Owner / milestone | Evidence; M6a before-data preserved |
| Authority | R7/R23; SA2-Q-S03, SA1-Q-S4, AC01; CV6-05 / S-OD6 |
| Status | Not started |

## Goal & business context

Separate the target policy's effect from requiredness and later new techniques. Record the selected
MS05 allowance, size-default attempts and the restored first-allowed sign pass: MS05e was measured
and set aside under CV6-05, with identity proved against `f7be90f` (runtime `00647f9`), before any
target change. A remaining CV6 timing item is identified, not hidden or made an owner-stop prerequisite.

## Scope

In: all 17 fixed cells and a before-record. Out: any source, fixture, offer, weight or setting change.

## Repository rules

Read AGENTS/checklist; no Git/pack/log edits. Only the named GS gate. Record failures despite
--no-gate; no concurrent Pentomino timing work.

## Inputs & context

R7, verbatim:

> MS06 compares exact hits and time before/after this target change on **all 17 R23 cells**, using
> R5's commands and fixed requests; preserve the pre-change record before editing the objective.

Manifest: classic9 normal/hard/expert/master/nightmare/hell1; killer normal/hard/expert;
jigsaw9 normal/hard/expert/nightmare; greaterThan normal/hard/expert; diagonalX nightmare.
Twelve requests each, seed base 20260101, unchanged direct/pipeline routes: 204 primary outcomes.
Use the no-override MS05r4 default accepted at MS05r6b (the absorbed MS05d selection).
Preserve generation times, exact/shallow/miss counts, work and
both position metrics. Source/hash/job identity and all errors stay in the record.
Greater-Than Normal, Hard and Expert remain in this manifest. CV6-05 did not remove a cell or
change its seeds/settings: S-AV01 remains open at 5,209 ms against 1,400 ms on CV6's seeds and
10.6 s p95 on 7000-7039, under unchanged contracts. These are historical controls, not this
204-request before-record. Do not load the rejected pool patch or regenerate its evidence.

AC01: adjusted positions use `[max(min,1.25*wMin+V),max)`, only where defined; raw stays alongside.
Undefined adjusted values are null with a reason (unrated/off-band, non-finite/non-positive width,
vacuous/empty tier). Defined values remain unclamped. No reachability/global-minimum claim.

Anchors at `c9935cd`: `generator/tests/soak.js:378` (`seedFor`), `:388-403` (`generateOne`,
both routes already use strict exact flags and omit maxAttempts), `:484` (generation timer).
Use r3's accepted JSON/absolute-index shard API; all 17 boards have 81 cells, default eight attempts.

## Files to create/modify

- `docs/difficulty-v3/evidence/MS06a/` and
  `docs/difficulty-v3/target-scope-2026-11-12.md` (actual date if later).
- No application, fixture, test, guide or task-pack file.

## Implementation steps

1. Record the MS05r4/r6b accepted default, restored first-allowed sign pass and MS05e's
   "measured, set aside" disposition. Cite the orchestrator's existing identity proof and completed
   record corrections; do not repeat restoration or proof through developer Git actions.
   Record the actual source, machine and exact manifest.
2. Run each cell with its own JSON path. Confirm 12 outcomes/cell and 204 overall.
3. Produce the before-table, including failures, per-cohort denominators, both distributions and times.
4. Hand the immutable before-record to MS06b/MS06d.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS06a-B01 | The owner's target decision has a comparable pre-change record |
| MS06a-B02 | No miss or undefined position disappears from reporting |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS06a-T01 | All 17 cells/204 outcomes and current default are identified |
| MS06a-T02 | Time/work/position fields use MS02/MS05c semantics |
| MS06a-T03 | Source and generator behavior are unchanged |

## Test plan and gate

From Generator, first cell:

```powershell
node tests\soak.js --variant=classic9 --level=normal --count=12 --seed=20260101 --no-gate --json=..\docs\difficulty-v3\evidence\MS06a\classic9-normal.json
```

Repeat for every cell above. Use MS05c's `--from/--total-count` shards if a whole cell cannot
fit 540 seconds, preserving absolute request tags and merging raw rows exactly once.
All possibly >10-second commands use the checklist lock wrapper. Jobs=1; soak has no --jobs.
Estimate 10-540 seconds/cell, 0.5-3 hours
total; enforce the 540-second process ceiling. **Announce to the orchestrator before starting
(pentomino runs in parallel on the same machine).** Incomplete evidence blocks MS06b.
No application test rerun is needed for evidence-only content; the orchestrator's task acceptance
still verifies the unchanged quick baseline.

## Definition of done & handoff

Return complete paths/counts/times and invariant failures, not only exit codes. Do not edit the
before-record after source changes; create a separately labelled replacement if genuinely needed.

## Resume rules — S-OD4

Review: orchestrator only. Correctness/evidence corruption or changing a recorded decision stops
for the owner; performance/availability becomes a named item with numbers, routed to MS07e then
MS18c/MS18d, and the task continues. No new evidence class/tooling task for a slow cell.
Use `Invoke-Dv3Node` for every possibly >10-second command, <=540 s; use existing absolute-index
shards and report any uncompleted population honestly. Return the inherited/new item list.
This evidence-only task verifies the unchanged quick baseline; it adds no suite or CI change.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (evidence only) |
| Start | 2026-11-14 17:44 (+07:00) |
| End | 2026-11-14 18:10 developer (runs 17:46:52-18:02:17); orchestrator review and commit |
| Duration | 26 min developer; 17 locked commands, 570.1 s helper time (longest killer Expert 150.7 s); no lock wait (Pentomino paused) |
| Model | claude-sonnet-5.5 (developer); claude-opus-5.5 (orchestrator review) |
| Token usage | 62 model calls; 8,428,601 input tokens (8,202,729 cache reads); 81,017 output tokens |
| AI credits | about 220 (developer) |
| Verification | Developer: 17 cells, one locked `tests\soak.js --count=12 --seed=20260101 --no-gate --json` command each, all exit 0; every ledger complete with 12 rows, indexes 0-11: **204 outcomes**; 0 request errors, invariant failures, check, reference or final-path errors; nothing sharded. Identity: the 63-file source hash `a073f9bd…`, `greater-than.js` `24dbbe37…` and `digger.js` `3be14d5e…` equal MS05e's `before/` records on `f7be90f`; the ledgers record HEAD `ef8a9cc`, `dirty: false`; six cells reproduce MS05r4's counts exactly. Orchestrator: the tree changed only `docs/` (`git diff --quiet HEAD` over generator, core, player, the guides, `AGENTS.md`, `.github` exit 0), so MS05r6c's quick baseline applies by identity; locked re-runs of classic9 Hard and jigsaw9 Normal reproduce their ledgers row for row (puzzle hash, outcome, score, full ratings) |
| Acceptance | MS06a-B01, B02, T01-T03 met. Before-record: `docs/difficulty-v3/target-scope-2026-11-14.md` (time, work, raw and adjusted positions with null reasons, per-cohort denominators, ledger SHA-256s) and `docs/difficulty-v3/evidence/MS06a/` (17 JSON ledgers, 17 transcripts). Totals 163 exact / 39 shallow / 2 miss, 454.6 s generation. The soak's own `RESULT: FAIL` for classic9 Normal/Nightmare and Killer Hard/Expert is recorded as measured under `--no-gate`, not hidden |
| Issues & resolutions | (1) Two mistyped invocations before classic9 Nightmare exited 2 in 0.18 s with "nothing to do", generated nothing and wrote no ledger; their stray transcripts were deleted. (2) Trailing whitespace stripped from the 17 console transcripts (152 lines); the JSON ledgers are untouched. (3) New items S-AV18 (Greater-Than Expert requests 2 and 5 off-band in Master, as in MS02), S-AV19 (the informational `SLOW` flag in 9 of 17 cells), S-AV20 (jigsaw9 Expert 1/12 and diagonalX Nightmare 2/12 shallow), added to check-list section 2 by the orchestrator |
| Handoff | MS06b/MS06d: the immutable before-record above; do not edit it after source changes. Items: S-AV01, S-AV05, S-AV06, S-AV07, S-AV14 carried with this record's numbers; S-AV02-S-AV04, S-AV08-S-AV13, S-AV15, MS05r6a-COV01 unchanged; S-AV16/S-AV17 withdrawn; S-AV18-S-AV20 new |
