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

In: rating/cache3, classification-aware cache validation/comparison, current references/docs,
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

Keep worker wire version1 and history store VERSION1. Current own-cache wire must have explicit
boolean exact and a complete current-version rating; reject missing classification/old version,
not infer it from level equality. No new solve in a cache comparator. Compare exact, solved,
ratingVersion and normalized techniqueCounts in addition to existing givens/solution/score/level;
semantic model differences (units/regions/cages/signs) also cannot count as the same puzzle.
Ignore timings/work counters and symbol display mode. Only current canonical producer data enters
this cache; do not broaden requiredOf to imported summaries.

Keep exports' existing positive ratingVersion field and no external floor/target/work certificate.
Do not blindly replace literal2 in legacy/stub/import tests or old help source text.
Current reference fields are `v3Expected:{level,required}`; unrated null/null. Historical labels,
v2 family certificates and preprocessing arrays remain history. Consolidate every reclassification.
Final catalogue40 IDs/34 unscoped, uniqueness IDs exactly UR/BUG+1; orders190/194/196/198/200/202.

Write the actual selected limits (not just starting values), scope/counter definitions, cap and C
decisions and source evidence in `docs/difficulty-v3/limits-v3.md`. New-pattern limits freeze with
v3: subsequent changes require a new rating version. MS18 cannot tune them.

### Anchors at `2c665bb`

| File:line / quote | Change |
|---|---|
| `generator/js/ui/cache.js:47`, `const SCHEMA_VERSION = 2` | Purge old cache |
| `generator/js/ui/cache.js:228-284`, `function verify` | Current classification and comparison |
| `generator/tests/manual/difficulty.test.js:759-767`, `ratingVersion` | Current-only assertions |
| `generator/tests/manual/difficulty.test.js:1316`, `p.rating.ratingVersion` | Generated version |
| `generator/tests/suites/replay.test.js:1601` | Inspect historical/stub intent, not blind replacement |

## Files to create/modify

- `generator/js/engine/difficulty.js`, `generator/js/ui/cache.js`; cache/export/history/pipeline/
  replay current-version tests, manual difficulty reference/version assertions.
- E's affected GR data; Player importer/fixtures tests only for positive-version compatibility,
  never rewrite old puzzle/export fixture claims.
- Limits-v3, notes, `docs/README.md`; Generator design6.6/6.7/6.8/13.7/14.3 and limitations;
  Player design6.2/8.3/9/10; both user/developer guides.

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
| MS17b-T01 | Rating/cache3, history/wire1, cache2 purge and explicit exactness enforced |
| MS17b-T02 | Same-grid different classification/model rejected; timing/display differences ignored |
| MS17b-T03 | Current references,40/34 catalogue, selected limit record and old imports pass |
| MS17b-T04 | GR/GD and both quick sets pass or intermediate availability misses are explicitly recorded |

## Test plan and gates

Generator `node tests\node-runner.js --suite=cache,history,export,pipeline,technique-weights,difficulty-floor`;
Player `node tests\node-runner.js --suite=importer,fixtures,help`; both quick sets.
Test schema2 purge, schema3 missing exact/counts/version, exact/shallow same score/grid, changed cages,
Wordoku display-only change and old positive ratingVersion2 import. Complete E GR under MS17b:

```powershell
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS17b\wire\G09.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS17b\analysis\G01.json
node tests\node-runner.js --suite=difficulty
```

Jobs1/no --jobs; GR5-35 minutes, GD1-8 minutes planning allowance. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** Ten-minute command ceiling.
Version-only changes do not authorize a hash rewrite; full GG check belongs to final evidence.

## Definition of done & handoff

Give MS18 the immutable release-candidate identity, actual frozen settings, reference catalogue and
all compatibility results. No support publication or claim of final qualification yet.

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
