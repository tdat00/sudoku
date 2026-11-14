# MS06d — Measure and report the full target policy

| Header | Value |
|---|---|
| Depends on | MS06c2 accepted after MS06c1 |
| Size / active time | Small; 20-30 minutes plus GS |
| Owner / milestone | Evidence; M6 isolated comparison complete |
| Authority | R7/R23; owner target decision and AC01; CV6-05 |
| Status | Not started |

## Goal & business context

Show what targeting changed in hits, score distribution and time. A prettier median cannot hide
fewer qualifying puzzles.

## Scope

In: repeat MS06a's 17 cells/204 requests and publish the comparison. Out: changing any source,
target scope, cap, weight, offer or expected fixture.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. Source identity stays fixed during the run. Only GS.

## Inputs & context

R7, verbatim:

> Report a loss of exact hits in any cell to the owner, with counts and timings. Do not silently drop
> target propagation or broaden a budget to repair it.

Use the exact MS06a manifest and commands, changing only output directory to MS06d. Keep selected
MS05 cap, base seed 20260101, 12 requests/cell and routes. Compare exact and all-in-band cohorts
separately. Judge upper bias on the adjusted exact cohort; raw positions remain visible.
MS02's null reasons/unclamped values apply. Every request remains in the hit denominator.
Anchors at `c9935cd`: `generator/tests/soak.js:378` (`seedFor`), `:388-403` (`generateOne`),
`:484` (generation timer). Use r3's absolute-index shards, MS06c1 transport and MS06c2 activation;
keep r5p's default policy. These fixed 81-cell comparison boards still default to eight attempts.

**CV6-05 expectation (projection, not an acceptance threshold):** a small or null target effect
on Greater-Than Normal, Hard and Expert is a valid result, not a defect to repair. Their restored
first-allowed sign pass transports the target but does not consume it; the target acts only in
already-entered local acceptance and `attemptBest` continuation, with no inequality refinement.
Keep all three cells in the 17-cell/204-request comparison, report actual effects and any hit loss,
and do not add a sign comparator, rerun discovery or tune the policy to manufacture an improvement.

## Files to create/modify

- `docs/difficulty-v3/evidence/MS06d/`, the MS06a target-scope record's after/comparison sections,
  and `docs/difficulty-v3/notes.md`.
- No implementation, fixtures or task-pack files.

## Implementation steps

1. Verify the before-record and current source/default identities.
2. Run all cells; validate request counts, invariant failures and reference outcomes.
3. Compare per-cell integer hits, work, time, both position cohorts and target deviation.
4. Report every hit loss as a named numerical item to MS07e and MS18c/MS18d. Continue under S-OD4;
   do not revert the accepted target scope or stop for the owner solely for availability.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS06d-B01 | Benefits and hit/time regressions are reported together |
| MS06d-B02 | The accepted full-scope policy is not silently narrowed |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS06d-T01 | All 204 outcomes match MS06a's request identities/configuration |
| MS06d-T02 | Null reasons, denominators, both cohorts and raw/adjusted metrics are correct |
| MS06d-T03 | No source change; unresolved invariant failures are explicit blockers |

## Test plan and gate

From Generator:

```powershell
node tests\soak.js --variant=classic9 --level=normal --count=12 --seed=20260101 --no-gate --json=..\docs\difficulty-v3\evidence\MS06d\classic9-normal.json
```

Repeat all MS06a cells, using the same absolute-index MS05c shards if needed and merging raw
rows once. Run possibly >10-second commands through the checklist lock wrapper.
Jobs=1, no --jobs. Estimate 10-540 seconds/cell, 0.5-3 hours total; stop
at the 540-second process ceiling. **Announce to the orchestrator before starting (pentomino runs in parallel on
the same machine).** Evidence-only: no new application test/golden run; acceptance quick verification
belongs to the orchestrator.

## Definition of done & handoff

Hand MS07/MS18 the immutable isolated comparison, actual times, loss report and source identities.
Availability loss is evidence for the owner, not a fabricated green rate or automatic policy rollback.

## Resume rules — S-OD4

Review: orchestrator only. Correctness/evidence corruption or changing a recorded decision stops;
performance/availability is a named numerical item for MS07e then MS18c/MS18d, not an owner stop.
Continue within existing bounds; no new evidence class/tooling task to work around a slow cell.
All possibly >10-second payloads use `Invoke-Dv3Node`, <=540 s, with existing absolute-index shards.
Return the inherited/new item list; verify the unchanged quick baseline, with no suite/CI changes.

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
