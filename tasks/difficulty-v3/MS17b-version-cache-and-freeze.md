# MS17b — Version 3, current cache and frozen reference catalogue

| Header | Value |
|---|---|
| Depends on | MS17a accepted |
| Size / active time | Medium; 50-60 minutes plus GR/GD |
| Owner / milestone | Generator integration; M17 release candidate frozen |
| Authority | R20/R22; SA2-Q-S05/S07/S10 |
| Status | Not started |

## Goal & business context

Publish the changed meaning of difficulty as one new rating/cache version while retaining old
Player imports and historical evidence. Freeze all measured new-pattern limits.

## Scope

In: rating/cache 3, classification-aware cache validation/comparison, current references/docs,
frozen limit record. Out: retuning, history envelope change, export floor certificate or offers.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. No deployment before final evidence. Old positive-version
external claims remain imports, never fresh requiredness certificates.

## Inputs & context

R22, verbatim:

> Set `RATING_VERSION=3` in `generator/js/engine/difficulty.js` and cache `SCHEMA_VERSION=3` in
> `generator/js/ui/cache.js`; purge schema 2.
> Cache comparison must include acceptance-relevant current classification, not just same grids,
> score and level.

Keep worker wire version 1 and history store VERSION 1. Current own-cache wire must have explicit
boolean exact and a complete current-version rating; reject missing classification/old version,
not infer it from level equality. No new solve in a cache comparator. Compare exact, solved,
ratingVersion and normalized techniqueCounts in addition to existing givens/solution/score/level;
semantic model differences (units/regions/cages/signs) also cannot count as the same puzzle.
Ignore timings/work counters and symbol display mode. Only current canonical producer data enters
this cache; do not broaden requiredOf to imported summaries.
Validate the raw decoded wire's explicit boolean **before** `SG.pipeline.fromWire`: that function
already coerces an absent/non-boolean flag to false, so checking only the reconstructed result
cannot distinguish a valid shallow entry from missing classification. Preserve r3's internal work
and MS06 target transport while ignoring them for puzzle equality as specified.

Keep exports' existing positive ratingVersion field and no external floor/target/work certificate.
Do not blindly replace literal 2 in legacy/stub/import tests or old help source text.
Current reference fields are `v3Expected:{level,required}`; unrated null/null. Historical labels,
v2 family certificates and preprocessing arrays remain history. Consolidate every reclassification.
Final catalogue 40 IDs/34 unscoped, uniqueness IDs exactly UR/BUG+1; orders 190/194/196/198/200/202.

Write the actual selected limits (not just starting values), scope/counter definitions, cap and C
decisions and source evidence in `docs/difficulty-v3/limits-v3.md`. New-pattern limits freeze with
v3: subsequent changes require a new rating version. MS18 cannot tune them.
Record the actual shallow allowance (256 unless later decided otherwise), size-attempt policy
8/4/2, CV6-05's restored first-allowed sign pass (no sign-pool constant; target transported, not
consumed there) and selected C separately from new-pattern limits. MS05e's rejected candidate
belongs to historical evidence, not the frozen production configuration. Do not copy obsolete
global-eight or Infinity-default descriptions from the pause evidence.

### Anchors verified at c9935cd (find symbols after later tasks)

| File:line / quote | Change |
|---|---|
| `generator/js/ui/cache.js:47`, `const SCHEMA_VERSION = 2` | Purge old cache |
| `generator/js/ui/cache.js:228-284`, `function verify` | Current classification and comparison |
| `generator/tests/manual/difficulty.test.js:765-773`, `ratingVersion` | Current-only assertions |
| `generator/tests/manual/difficulty.test.js:1374`, `p.rating.ratingVersion` | Generated version |
| `generator/tests/suites/replay.test.js:1600`, `techniqueCounts: report.spec.counts, ratingVersion: 2` | Inspect historical/stub intent, not blind replacement |

## Files to create/modify

- `generator/js/engine/difficulty.js`, `generator/js/ui/cache.js`; cache/export/history/pipeline/
  replay current-version tests, manual difficulty reference/version assertions.
- E's affected GR data; Player importer/fixtures tests only for positive-version compatibility,
  never rewrite old puzzle/export fixture claims.
- Limits-v3, notes, `docs/README.md`; Generator design 6.6/6.7/6.8/13.7/14.3 and limitations;
  Player design 6.2/8.3/9/10; both user/developer guides.

## Implementation steps

1. Check all preceding integration/evidence and selected values; no missing technique cleanup here.
2. Bump rating/cache atomically, validate current classification and preserve history/imports.
3. Add comparator/corruption/legacy vectors; update only current-version assertions.
4. Freeze real limit values and consolidate current references, counts, limitations and docs links.
5. Refresh version-bearing GR data, run GD and both quick sets.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS17b-B01 | Old cached classification cannot masquerade as v3 exactness |
| MS17b-B02 | Old puzzles/history remain usable and reclassifications are honest |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS17b-T01 | Rating/cache 3, history/wire 1, cache 2 purge and explicit exactness enforced |
| MS17b-T02 | Same-grid different classification/model rejected; timing/display differences ignored |
| MS17b-T03 | Current references, 40/34 catalogue, selected limit record and old imports pass |
| MS17b-T04 | GR and both quick sets pass; complete GD coverage with any requiredness-related availability/median-time misses explicitly recorded under section 7, never waived silently |

## Test plan and gates

Generator `node tests\node-runner.js --suite=cache,history,export,pipeline,technique-weights,difficulty-floor`;
Player `node tests\node-runner.js --suite=importer,fixtures,help`; both quick sets.
Test schema 2 purge, schema 3 missing exact/counts/version, exact/shallow same score/grid, changed cages,
Wordoku display-only change and old positive ratingVersion 2 import. Complete E GR under MS17b:

```powershell
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS17b\wire\G09.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS17b\analysis\G01.json
Invoke-Dv3Node -Task MS17b -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=time) > nightmare >')
```

Jobs 1/no --jobs; GR 5-35 minutes. Complete GD using checklist section 7's retained level/group
shards, with actual timing projections, not an unbounded whole-suite run. Hit/median-time findings
at affected levels remain failed assertions and go to MS18d; correctness and coverage still block.
Use the shared lock for all commands expected over 10 seconds. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** 540-second process ceiling (check-list section 7).
Version-only changes do not authorize a hash rewrite; full GG check belongs to final evidence.

## Definition of done & handoff

Give MS18 the immutable release-candidate identity, actual frozen settings, reference catalogue and
all compatibility results. No support publication or claim of final qualification yet.

## Resume rules — S-OD4

Review: analyst cross-review. Correctness/evidence corruption or changing a recorded decision
stops; time/availability is a named numerical MS18c/MS18d item and work continues.
Use `Invoke-Dv3Node` for every possibly >10-second payload, <=540 s, and the current bounded quick
manifest. A cost-bounded unexecuted GD population stays explicit, not a passed gate or owner stop
solely for time. Any added suite owns its r6c CI group; no new slow-cell evidence/tooling class.
Return the inherited/new item list and actual frozen policy/source identities.

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
