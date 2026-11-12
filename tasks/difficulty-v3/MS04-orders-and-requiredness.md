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
| Status | Accepted and committed with one open finding (`difficulty-v3 MS04: Orders, counter and derived certificate`) |
| Start | 2026-11-12 15:52 (+07:00) |
| End | 2026-11-12 16:57 developer; 17:45 orchestrator review and commit |
| Duration | 66 min developer (3,942 s); about 12 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 292 model calls; 66,715,147 input tokens (66,108,567 cache reads); 233,427 output tokens |
| AI credits | about 1,046 (developer) |
| Verification | Developer: targeted `--suite=difficulty-floor,technique-weights,techniques,tech-fish,tech-subset,replay,steps,player,replay-recorders` 740 passed (32.6 s); generator quick 47 suites, 2,986 passed (116 s); player quick 30 suites, 1,670 passed (29 s); help examples `--check` 26 IDs match; GG 104 shards, `--check-hashes` 27 of 520 changed, `--update-hashes`, then all 520 unchanged; GR wire 4 shards (G09, G10, G11 differ, written, up to date) and analysis 14 shards (G09-G12 differ, written, up to date); GD `--suite=difficulty,killer,greater-than` 377 of 378 passed (338 s). Orchestrator re-run: generator quick 2,986/2,986 (117 s), player quick 1,670/1,670, hash merge `--check-hashes` all 520 unchanged from the current sources, wire and analysis merges `--check` up to date, help examples up to date |
| Acceptance | MS04-B01..B03 and MS04-T01..T03 met. MS04-T04 met except the GD timing assertion CV6 (see Issues). Diff reviewed: orders `cageCombo` 44, `ineqChain` 46, `jellyfish` 137 with headers; `nodes = 0` per `findSubset` call (mutation-verified test); `requiredOf(rating, level, model)` returns null for a missing or unsolved rating, vacuous for veryEasy or an empty tier, otherwise "some used technique outside the floor"; equals `certifyFloor` on all 26 rated puzzles at all nine levels and on generated classic9, Killer, Jigsaw9 and Greater-Than samples |
| Issues & resolutions | (1) OPEN: the manual `greater-than` suite fails `normal: CV6 p95 within the 700 ms budget` (2,035 ms against the limit of 1,400 ms). The cause is the contracted `ineqChain` order alone (65 gives p95 97 ms on seeds 300-319). Seeds 7000-7039 give p95 5,043 ms against 125 ms. Seed 308 needs 4 attempts and 604 steps instead of 1 and 27, because digs to 24 clues still rate Easy. Not repaired here: the order is contracted and the assertion is not relaxed. SA2 (the pack author) is asked to name the owning task or raise a question in `docs/difficulty-v3/clarifications.md`; details in `docs/difficulty-v3/notes.md`. (2) 27 of 520 hashes, wire G09-G11 and analysis G09-G12 changed; each class was attributed to the orders by the four old/new order and counter combinations; the counter reset changes no output. (3) `classic-medium` (published `normal`) has always rated Easy (score 48); `v3Expected` records `easy` and the label stays. (4) Pinned replay, steps and player assertions re-derived from the refreshed goldens. (5) `difficulty-floor.test.js` keeps its pre-existing final blank line |
| Handoff | MS05: `SG.difficulty.requiredOf(rating, level, model)` returns `{required, vacuous, floorLevel}` or null; the null check precedes level validation (unknown level throws `difficulty.unknownLevel` only for a solved rating); the caller guarantees uniqueness and the same model and givens. Fixtures: `core/tests/fixtures/techniques.js` exposes `historyV2`, `registryOrder`, `CURRENT = {}` and `byId`; `rated.js` entries carry `v3Expected: {level, required}`. The classic9 Normal seed-1 puzzle is shallow (not required, floor Easy, rated Normal 209); constructed Normal 1/2/3 give false/true/false; constructed Nightmare is shallow |
