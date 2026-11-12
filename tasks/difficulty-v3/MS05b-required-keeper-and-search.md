# MS05b — Activate required exactness throughout generation

| Header | Value |
|---|---|
| Depends on | MS05a accepted |
| Size / active time | Medium, upper end; 55-60 minutes plus gates |
| Owner / milestone | Generator engine/consumers; M5b truthful exactness |
| Authority | R2-R5/R23; SA1-Q-S7, SA1-Q-S3 |
| Status | Not started |

## Goal & business context

Make an exact puzzle genuinely require the requested tier. Fix the keeper's earlier prefilters,
continue beyond shallow states, and make all consumers use the same result.

## Scope

In: canonical requiredness, keeper/local/refinement exits, model-safe ratings, warnings/events,
soak/qualifier/manual predicates. Out: extra shallow cap, target optimization, new techniques/offers.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. No second production floor solve, no external certificate.
Only named gates; preserve both quick sets and document changed behavior in both languages.

## Inputs & context

R3, verbatim:

```text
isExact(rating,L,model) =
  rating exists AND rating.solved === true AND rating.level === L
  AND requiredOf(rating,L,model)?.required === true
```

> Keep the current level-gap distance for off-band solved results; unsolved is Infinity.
> In-band certified-required is 0; in-band proved-shallow is 0.5. Compute this final distance from
> canonical counts before every keeper prefilter, including `closer`; the keeper still executes
> `countWithin(...) === 1` before storing.

Use the private predicate with the actual candidate model. Change `keeper.closer(rating, model)`
and every caller, including Killer. Missing model/unsolved rating cannot pass a prefilter.
Strict distance ties retain encounter order. Offer every valid completely rated candidate even if
the local path will reject its score decrease. A required in-band lower score beats a shallow higher
score. Local search runs while not exact and within existing caps; null `rateCounted` stays unrated.

Above-band refinement may land shallow; do not return early and bypass continued local search.
Rebuild group/clue counts from the refined state before continuing. Sign changes reset memo entries;
cage/sign changes always use their own fresh canonical rating. A safety-net replacement invalidates
any prerating. Reveals preserve uniqueness, not the greedy floor outcome.

Emit prepared `tune.shallow` with required=false; hit true; unverified/unrated miss null.
Return both approximate+shallow warnings only for a complete in-band shallow fallback.
Pipeline/view already transport exactness. Change soak's pipeline path and qualifier hit predicate.
Soak I5 and manual digLevel assertions become exact => solved, requested band, required.
Reject diagnostic weight/band overrides before generation if any floor is not a ladder prefix.

The other manual hit counters are consumers too: use `p.result.exact` in Killer/variants wrappers,
`p.exact` for pipeline results in Jigsaw, Greater-Than, extra-regions and Wordoku. Update their
approximate-warning branches consistently. Keep ordinary "score lies in this band" assertions
where they are genuinely about score, not a hit/exactness claim; do not blanket-replace comparisons.
Baseline anchors under `generator/tests/manual/`: killer.test.js:1069; variants.test.js:202,260;
jigsaw.test.js:843; greater-than.test.js:1008,1108; extra-regions.test.js:530,550; wordoku.test.js:771.

### Anchors at `2c665bb`

| File:line / quote | Change |
|---|---|
| `generator/js/engine/digger.js:1041-1091`, `function createKeeper` | Quality before closer/offer/count |
| `generator/js/engine/digger.js:1100-1147`, `function refineDown` | Fresh ratings after reveals |
| `generator/js/engine/digger.js:1320-1499`, `function* localSearchSteps` | spec.level; shallow continuation |
| `generator/js/engine/digger.js:1661-1739`, `let attemptBest = null` | All sample/keeper/outer exits |
| `generator/js/variants/killer.js:907-916` | Model-aware closer |
| `generator/tests/qualify.js:170`, `out.hit =` | Keep validity/solved/approximate guards |

## Files to create/modify

- `generator/js/engine/digger.js`; Killer and Greater-Than call sites as required.
- `generator/tests/soak.js`, `qualify.js`; digger/floor/pipeline/event/result-view suites.
- `generator/tests/manual/difficulty.test.js`: hit count/I5/digLevel assertions.
- The six other manual files named above: exact-hit counters and directly coupled warning/I5
  contracts only; no threshold weakening or unrelated assertion changes.
- E's affected output fixtures; Generator locales only for activation corrections.
- `generator/design.md` 6.8/7.2/13.13/15.3; both user and developer guides; v3 notes.

## Implementation steps

1. Apply model-aware exactness/distance consistently before every prefilter.
2. Use the existing strategy seam (`options.strategy`, `ctx.keeper`) for scripted regressions;
   do not export the private keeper merely for tests.
3. Repair local/refinement continuation and stale model/memo paths; preserve uniqueness/symmetry.
4. Activate events/warnings, tool predicates and intended manual contracts together.
5. Refresh E; hand the manual contracts to MS05d for the one full GD on the selected default.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05b-B01 | Shallow cannot block or impersonate required exactness |
| MS05b-B02 | Same-band fallback explains the missing tier and offers Retry |
| MS05b-B03 | No invalid/ambiguous/unrated puzzle is published to improve hit rate |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05b-T01 | Scripted shallow->required, reverse order, equal ties and cutoff/ambiguity pass |
| MS05b-T02 | Actual secured/cage/sign model is rerated and certified; memo is model-bound |
| MS05b-T03 | Engine, worker, view, soak and qualifier share exactness |
| MS05b-T04 | Sync/cooperative parity, first-exact stop, caps and both quick sets pass |

## Test plan

Script keeper distances 0.5 then 0, 0 then 0.5, 0.5 then 0.5. CountWithin null/2 must not store.
Test a lower-score required candidate, an above-band->shallow refinement, a safety replacement,
missing/unsolved ratings, and broken-prefix diagnostic overrides. Include small real variant samples.
Syntax-check the changed manual files with `node --check`; their targeted I5/CV3 final runs are
owned by MS18e. Before then, pipeline/soak/qualification exercise the shared result contract.

From Generator, exact syntax commands:

```powershell
node --check tests\manual\difficulty.test.js
node --check tests\manual\killer.test.js
node --check tests\manual\variants.test.js
node --check tests\manual\jigsaw.test.js
node --check tests\manual\greater-than.test.js
node --check tests\manual\extra-regions.test.js
node --check tests\manual\wordoku.test.js
```

Generator: `node tests\node-runner.js --suite=digger,difficulty-floor,pipeline,events,result-view`.
Then both quick sets. E with task MS05b, GG/GR complete manifests:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS05b\hashes\classic4-veryEasy-00.json
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS05b\wire\G09.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS05b\analysis\G01.json
```

Jobs=1, no --jobs flag. Estimate 1-120 seconds/shard, 10-90 minutes for E.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
MS05d owns full GD after selection; its I5/digLevel/soundness must pass. Ten-minute ceiling;
no qualification or new cap here.

## Definition of done & handoff

MS05c receives required exactness with existing caps only. Hand off all predicate sites, regression
evidence, source IDs and any availability shortfalls; no support-list edit or commit.

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
