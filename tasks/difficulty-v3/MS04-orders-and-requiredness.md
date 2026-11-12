# MS04 — Monotone orders and the derived certificate

| Header | Value |
|---|---|
| Depends on | MS03d accepted and committed |
| Size / active time | Medium; 45-60 minutes, plus gates |
| Owner / milestone | Shared solver and Generator; M4 prefix invariant |
| Authority | R1/R2/R8/R20/R21; PROC-S1, AUTH-S2, SA1-Q-S7 |
| Status | Not started |

## Goal & business context

Make the canonical solve a valid witness of requiredness before generation uses it. Correct the
three order inversions and remove the subset finder's dependence on earlier calls.

## Scope

In: orders, per-call counter, `requiredOf`, current-vs-historical test expectations. Out: changing
weights/bands, accepting requiredness in generation, new techniques, qualification or support lists.

## Repository rules

Read `AGENTS.md` and the checklist. No Git writes or pack/log edits. Classic scripts, CRLF/no BOM,
both language guides with changed living facts. Both quick sets finish green; only listed gates.

## Inputs & context

R8, verbatim:

> Change orders, not weights: `cageCombo 55->44`, `ineqChain 65->46`, `jellyfish 160->137`.
> Assert adjacent nondecreasing weights over the registry's actual sorted sequence, including ties.
> Preserve calibrated tie outcomes: ineqChain over pointing, nakedQuad over ruleOf45, jellyfish over
> cageSplit. Raw baseCost need not be globally weight-monotone; existing costs already differ.

Reset `nodes` at entry to `findSubset`, not per combination. Keep all old preprocessing arrays and
the fixture `LADDER` unchanged. Separate the current registry expectation from that historical ladder.

R2, verbatim:

```text
FloorResult = { required:boolean, vacuous:boolean, floorLevel:string|null }
requiredOf(rating, level, model)
  1. rating is null, or rating.solved !== true
       -> null
  2. levelIndex(level) === 0, or tierTechniques(level, model) is empty
       -> { required: true, vacuous: true, floorLevel: null }
  3. otherwise
       -> { required: some id with rating.techniqueCounts[id] > 0
                      is not in floorTechniques(level, model),
            vacuous: false,
            floorLevel: LEVELS[levelIndex(level) - 1] }
```

Public API: `SG.difficulty.requiredOf(rating, level, model)`. No solve, uniqueness count, imported
claim detection or persisted certificate. Preconditions: floor IDs are a prefix of the actual
variant-filtered ladder; same model/givens/initialization/finder defaults; uniqueness allowed and
proved by the caller; complete canonical `rate`/`rateCounted`, not restricted `classify` or a claim.
MS01's reference remains independent and uses only its inherited budget.

Keep v2 fixture labels and family sets as history. Add `entry.v3Expected = {level,required}` for
current reference expectations; unrated is `{level:null,required:null}`. In the manual reference
tests, assert these current expectations and the current floor, not that historical family sets are
v3 floors. Give those cases the filterable prefix `v3 reference`. Historical published labels remain
data, not weight-fitting targets. Record reclassifications in `docs/difficulty-v3/notes.md`.

In `core/tests/fixtures/techniques.js`, keep the original BY_ID/after data as `historyV2.byId`,
retain `ladder`, and expose separate `registryOrder` and an active `byId` formed from the historical
map plus explicit current overrides. `ids` enumerates the active map. Later window changes can add
current fixtures without overwriting v2 positions. Never call frozen `before/through` with a new ID.

### Anchors at `2c665bb`

| File:line / quote | Change |
|---|---|
| `core/js/engine/tech-subset.js:195-203`, `function findSubset` | Reset operation spacing once per find |
| `core/js/engine/tech-ineq.js:472-480`, `id: 'ineqChain'` | Order 46 |
| `core/js/engine/tech-fish.js:499-521`, `SG.techniques.register` | Jellyfish order 137 |
| `core/tests/suites/techniques.test.js:41-43`, `F.ladder` | Use current registry expectation |
| `generator/tests/manual/difficulty.test.js:735-747` | Calibrated tie assertions |
| `generator/js/engine/difficulty.js:455-474`, `SG.difficulty = {` | Export derived helper; MS01 moves this |

## Files to create/modify

- `core/js/engine/tech-cage.js`, `tech-ineq.js`, `tech-fish.js`, `tech-subset.js`.
- `generator/js/engine/difficulty.js`; `generator/tests/suites/difficulty-floor.test.js`,
  `technique-weights.test.js`; `generator/tests/fixtures/rated.js`.
- `core/tests/fixtures/techniques.js`; `core/tests/suites/techniques.test.js`,
  `tech-fish.test.js`, `tech-subset.test.js`.
- `generator/tests/manual/difficulty.test.js`, `killer.test.js`, `greater-than.test.js`: intended
  order/current-reference expectations only.
- Evidence bundle E of checklist section 7; affected help examples only if actual replay changes.
- `generator/design.md` 6.6/6.7/13.7; both developer guides; v3 notes.

## Implementation steps

1. Establish separate current expectations while preserving historical inputs.
2. Move registrations and reset the subset counter. Add the actual sorted-weight/prefix assertions.
3. Implement `requiredOf` using MS01 helpers. Do not activate it in digger yet.
4. Compare with `certifyFloor` after independently proving uniqueness on constructed/published solved
   fixtures and small classic9/Killer/Jigsaw/Greater-Than samples. Use the same options/model.
5. Refresh only explained output differences through E; update docs and current reference records.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS04-B01 | Canonical counts now determine whether a nonvacuous tier was needed |
| MS04-B02 | Prior calls cannot move the same finder's work boundary |
| MS04-B03 | Historical labels/positions remain available and no level is pruned |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS04-T01 | Actual adjacent weights, variant prefixes and three tie outcomes pass |
| MS04-T02 | Derived/reference equality, null ratings, vacuity and unsupported previous levels pass |
| MS04-T03 | Identical Finding AND check count after unrelated calls; input state unchanged |
| MS04-T04 | Intended fixture changes, both quick sets and named manual checks are evidenced |

## Test plan

Use the existing Normal seed-1 shallow case and the constructed Normal 1/2/3 expectations
false/true/false; old constructed Nightmare is shallow. Test a changed cage/sign model by rerating
that model, not by pretending the helper can recognize a stale report. Include equal-order ties.

Generator: `node tests\node-runner.js --suite=difficulty-floor,technique-weights,techniques,tech-fish,tech-subset,replay,steps`.
Then both app quick commands: `node tests\node-runner.js` from each app.

GG/GR/GH: use the **complete E recipe**, task ID MS04, before final quick acceptance. Exact first shards:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS04\hashes\classic4-veryEasy-00.json
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS04\wire\G09.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS04\analysis\G01.json
node tests\node-runner.js --suite=difficulty,killer,greater-than
```

These are not partial passes: E specifies every remaining key and complete write/check commands.
Jobs=1 (no --jobs flag); estimate 1-120 seconds per shard, 10-90 minutes for E, 1-8 minutes for GD.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Stop/investigate any command at ten minutes. Do not run qualification.

## Definition of done & handoff

Give MS05 the canonical-origin/precondition boundary and all API tests; give later technique tasks
the current fixture schema. Report gates, differences and B/T IDs. No commit or log editing.

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
