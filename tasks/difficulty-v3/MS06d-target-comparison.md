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
| Status | Accepted (evidence only) |
| Start | 2026-11-14 23:58 (+07:00) |
| End | 2026-11-15 00:25 developer (17 locked commands 00:00:18-00:14:22, 570.5 s helper time); orchestrator review and commit |
| Duration | 27 min developer; about 10 min review |
| Model | claude-sonnet-5.5 (developer); claude-opus-5.5 (orchestrator review) |
| Token usage | 74 model calls; 12,734,900 input tokens (12,443,824 cache reads); 128,429 output tokens |
| AI credits | about 326 (developer) |
| Verification | Developer: MS06a's 17 cells x 12 requests repeated on HEAD `091a44b` (source `e435640c…`; `greater-than.js` byte-identical to before): **204 of 204 outcomes**, request identities, commands and manifest equal to MS06a's in every cell; 0 request errors or invariant failures; 128 requests give the identical puzzle, 76 a different one. Orchestrator: only `docs/` changed (`target-scope-2026-11-14.md` insertions only, the before text byte-identical); locked re-runs of classic9 Hard and jigsaw9 Normal reproduce the MS06d ledgers row for row |
| Acceptance | MS06d's criteria met: exact/shallow/miss 163/39/2 -> 164/38/2, in band 202 -> 202 (four request-level gains, three losses, all among the 76 changed puzzles; no loss hidden behind a better median); adjusted exact median lower in 8 of 14 non-empty cells, higher in 1, unchanged in 5 (pooled 0.623 -> 0.560); the 14 undefined adjusted rows identical; generation time 454.62 -> 454.42 s; full ratings +7.9 % (73,393 -> 79,170). Greater-Than: all 36 requests give the identical puzzle, the null effect CV6-05 projected. Comparison in `docs/difficulty-v3/target-scope-2026-11-14.md` (after and comparison sections) and `docs/difficulty-v3/evidence/MS06d/` (17 ledgers, 17 transcripts, `compare.cjs`, `comparison-tables.md`) |
| Issues & resolutions | (1) New items S-AV21 (jigsaw9 Expert exact 11 -> 10: request 0 from exact in 0.57 s to shallow in 2.62 s), S-AV22 (three request-level exact losses against four gains: classic9 Nightmare 1, jigsaw9 Expert 0, diagonalX Nightmare 6), S-AV23 (jigsaw9 cost: Nightmare 1.53x time and 2.6x full ratings, Expert 1.29x) added to check-list section 2. (2) Plateau effect: G10 (Killer Nightmare) is not among the 17 cells; Killer Hard full ratings +22 % and Expert +0.8 % at unchanged time. (3) S-AV08's 690.7 s is the quick-suite figure; the 204 requests show no rise. (4) Deviations: the after/comparison sections appended to MS06a's record as the task names it (before text byte-identical); the sequencer and comparison scripts kept in `evidence/MS06d/` so the soak's tracked-tree check stays clean (`dirty: false`) |
| Handoff | MS07a: M6 complete; the inherited items with MS06d's numbers (S-AV01, S-AV05-S-AV08, S-AV14, S-AV18-S-AV20) and new S-AV21-S-AV23 go to MS07e/MS18c; jigsaw9's cost and the request-level losses are watched at MS07e |
