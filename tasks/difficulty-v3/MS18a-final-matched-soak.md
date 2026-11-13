# MS18a — Final matched before/after record

| Header | Value |
|---|---|
| Depends on | MS17b accepted |
| Size / active time | Small; 25-35 minutes plus GS |
| Owner / milestone | Evidence; M18a matched final data |
| Authority | R7/R23/R24; AC01 |
| Status | Not started |

## Goal & business context

Measure the complete v3 candidate against the actual MS02 baseline and retain the isolated target
comparison. Do not compare old score-only hits with new required exactness as if they were identical.

## Scope and repository rules

In: fixed 17-cell/204-request final soak and analysis. Out: any tuning, implementation or offers.
AGENTS/checklist; no Git/pack/log writes; no simultaneous heavy run.

## Inputs & context

R23, verbatim:

> Shallow share is over **solved in-band** puzzles, not exact puzzles.
> Give exact and all-in-band cohorts separate counts and distributions; judge "hugs the top" on the
> exact cohort's attainable position.

Manifest: classic9 normal/hard/expert/master/nightmare/hell1; killer normal/hard/expert;
jigsaw9 normal/hard/expert/nightmare; greaterThan normal/hard/expert; diagonalX nightmare.
Twelve requests/cell, base 20260101, same direct/pipeline routes, no cap/window overrides.
Record errors, reference failures, work/cap rates, targets/deviations and generation/diagnostic times.

The accepted MS02 baseline has old hits 202/204, reference-qualified 91/204, shallow 111/202.
Its old `generationExact` cohort is score-only; recompute the reference-qualified cohort from its
stored `qualifiedHit` rows for a fair comparison. Do not run current requiredOf on old rating counts.
Tier meanings changed: baseline Hell 1 was vacuous; identify that explicitly. Keep each version's
stored position inputs/limits, not today's weights applied retrospectively.
Retain MS06a/d's isolated target comparison so later solver/cutoff effects are not attributed to targeting.
Null adjusted reasons/unclamped values remain AC01; no global-minimum or uniformity guarantee.

Anchors at `f788e02`: `generator/tests/soak.js:260` (`function seedFor(tag)`),
`:267-283` (`function generateOne(combo, tag)`), `:353` (`const t0 = process.hrtime.bigint()`).
Current reporting is MS02/MS05c/MS06c1; find quotes after later changes.
Read the actual baseline/evidence, not analyst sample estimates.

## Files to create/modify

- `docs/difficulty-v3/evidence/MS18a/`, new `docs/difficulty-v3/after-2026-11-12.md`
  (actual date if later), v3 notes.
- No baseline overwrite, source, fixture, offer or task-pack change.

## Implementation steps

1. Freeze identity/defaults and validate all baseline request keys.
2. Run the exact 17 cells; if already hidden by an explicitly inserted prior task, use the tool's
   diagnostic --include-unsupported rather than dropping that cell, and record it.
3. Compare integer hits, shallow shares, both position cohorts, work and time with all denominators.
4. Report every per-cell hit loss and preserve the isolated MS06 comparison.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18a-B01 | Final improvements and regressions are reported honestly against matched requests |
| MS18a-B02 | Old score-only hits/vacuity are not sold as old required exactness |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18a-T01 | All 204 outcomes/configuration/source identities and failures retained |
| MS18a-T02 | Qualified vs in-band cohorts, stored bounds, null reasons and costs correct |
| MS18a-T03 | No source/tuning change; incomplete/invariant-failed evidence is not a pass |

## Test plan and gate

Generator, first cell, then every manifest cell:

```powershell
node tests\soak.js --variant=classic9 --level=normal --count=12 --seed=20260101 --no-gate --json=..\docs\difficulty-v3\evidence\MS18a\classic9-normal.json
```

Jobs 1/no --jobs. MS02 actually took about 176 seconds across its 17 commands; v3 is unmeasured.
Allow 10-540 seconds/cell, 0.5-3 hours for planning; stop/investigate at ten minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Evidence-only; orchestrator verifies the unchanged quick baseline.

## Definition of done & handoff

Hand MS18b/e complete before/after tables, loss report, true cohorts and actual timings. Never
change the policy to make this evidence prettier.

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
