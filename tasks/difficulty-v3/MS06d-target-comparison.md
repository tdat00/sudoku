# MS06d — Measure and report the full target policy

| Header | Value |
|---|---|
| Depends on | MS06c2 accepted after MS06c1 |
| Size / active time | Small; 20-30 minutes plus GS |
| Owner / milestone | Evidence; M6 isolated comparison complete |
| Authority | R7/R23; owner target decision and AC01 |
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
Anchors at `f788e02` after MS02: `generator/tests/soak.js:260` (`function seedFor(tag)`),
`:267-283` (`function generateOne(combo, tag)`), `:353` (`const t0 = process.hrtime.bigint()`).
MS05b2/MS05c move these further. Target transport is MS06c1's; all-stage activation is MS06c2's.

## Files to create/modify

- `docs/difficulty-v3/evidence/MS06d/`, the MS06a target-scope record's after/comparison sections,
  and `docs/difficulty-v3/notes.md`.
- No implementation, fixtures or task-pack files.

## Implementation steps

1. Verify the before-record and current source/default identities.
2. Run all cells; validate request counts, invariant failures and reference outcomes.
3. Compare per-cell integer hits, work, time, both position cohorts and target deviation.
4. Report every hit loss to the orchestrator/owner. Do not revert the accepted scope on your own.

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
at ten minutes. **Announce to the orchestrator before starting (pentomino runs in parallel on
the same machine).** Evidence-only: no new application test/golden run; acceptance quick verification
belongs to the orchestrator.

## Definition of done & handoff

Hand MS07/MS18 the immutable isolated comparison, actual times, loss report and source identities.
Availability loss is evidence for the owner, not a fabricated green rate or automatic policy rollback.

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
