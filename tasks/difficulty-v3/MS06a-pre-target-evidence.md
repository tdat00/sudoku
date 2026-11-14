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
