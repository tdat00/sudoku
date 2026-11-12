# MS06a — Capture the isolated pre-target comparison

| Header | Value |
|---|---|
| Depends on | MS05d accepted |
| Size / active time | Small; 20-30 minutes plus GS |
| Owner / milestone | Evidence; M6a before-data preserved |
| Authority | R7/R23; SA2-Q-S03, SA1-Q-S4, AC01 |
| Status | Not started |

## Goal & business context

Separate the target policy's effect from requiredness and later new techniques. Record the selected
MS05 allowance in force, before any target implementation changes generation.

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
Use the no-override MS05d default. Preserve generation times, exact/shallow/miss counts, work and
both position metrics. Source/hash/job identity and all errors stay in the record.

AC01: adjusted positions use `[max(min,1.25*wMin+V),max)`, only where defined; raw stays alongside.
Undefined adjusted values are null with a reason (unrated/off-band, non-finite/non-positive width,
vacuous/empty tier). Defined values remain unclamped. No reachability/global-minimum claim.

Baseline anchors at `2c665bb`: `generator/tests/soak.js:202-228` (`function seedFor` /
`function generateOne`), `:234-241` (`const t0`); the current JSON/reporting API is from MS02/MS05c.

## Files to create/modify

- `docs/difficulty-v3/evidence/MS06a/` and
  `docs/difficulty-v3/target-scope-2026-11-12.md` (actual date if later).
- No application, fixture, test, guide or task-pack file.

## Implementation steps

1. Record the accepted MS05d source/default, machine and exact manifest.
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

Repeat for every cell above. Jobs=1; soak has no --jobs. Estimate 10-540 seconds/cell, 0.5-3 hours
total; stop/investigate a command at ten minutes. **Announce to the orchestrator before starting
(pentomino runs in parallel on the same machine).** Incomplete evidence blocks MS06b.
No application test rerun is needed for evidence-only content; the orchestrator's task acceptance
still verifies the unchanged quick baseline.

## Definition of done & handoff

Return complete paths/counts/times and invariant failures, not only exit codes. Do not edit the
before-record after source changes; create a separately labelled replacement if genuinely needed.

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
