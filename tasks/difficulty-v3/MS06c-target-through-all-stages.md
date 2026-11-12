# MS06c — Activate one target through all three stages

| Header | Value |
|---|---|
| Depends on | MS06b accepted |
| Size / active time | Medium, upper end; 55-60 minutes plus E |
| Owner / milestone | Generator; M6c full target policy |
| Authority | R6/R7/R23; owner SA2-Q-S03 / SA1-Q-S4; AC01 |
| Status | Not started |

## Goal & business context

Seek a reproducible position inside the raw band throughout guided dig, refinement and local
search, without sacrificing requiredness or adding post-exact polishing.

## Scope

In: all three stages and target lifetime, numeric trace compatibility, diagnostics/texts/tests.
Out: changed caps/weights, attainable-only sampling, a conditional guided-only policy, qualification.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. MS06a before-record is immutable. No intermediate
guided-only activation: all stages land together with both quick sets green.

## Inputs & context

R7, verbatim:

> Carry the originating sample's target through guided dig, `refineDown`, `localSearchSteps`,
> `searchStrategy` and `attemptBest`; do not redraw it from the later search RNG.
> Preserve the existing first-exact outer stop. Target propagation applies to already-entered
> stages; it introduces no unconditional post-exact polishing search.

Use MS06b's exact policy/shape/table. Draw `targetFor(spec,sampleRng)` once in the sample context;
direct digStage calls initialize only if absent. Distinguish an absent property from explicit null.
Carry `LevelPuzzle.target` and keeper candidates' target; search adopts `attemptBest.target`.
Structure-only offers made before any sample have target null, not an invented later target.
Global keeper/sample quality ties still retain encounter order; never compare unrelated samples
against a common redraw.

Separate bounded evaluation from removal uniqueness checks. Initialize current bounded state with
one guarded evaluation (`assumeUniqueness:false`, OBJECTIVE_STEPS=100000); count that call once.
If initialization is refused/capped, retain the input board and end that guided pass conservatively.
A proposal handover is already unique: score it without passing an undefined removal group to DFS.
Apply MS06b's tier-first pool and stop table. Empty pool terminates; refusals remain rejected.
`trace.keep` receives the numeric score/priority, never the discriminated object.

Refinement starts only when above band and without inequalities. It may continue after reaching
required in-band while above target, inside the SAME 64-rating allowance. Undo below-minimum,
tier-losing and non-improving reveals. Initially exact input does not trigger a new polishing pass.
Local moves use quality then target distance, not raw-score nondecrease. Continue after a shallow
refinement; preserve symmetry/clue floors/sign guard/memo invalidation and all caps.

Pipeline result/wire carry internal `target:number|null`; soak's row target and target deviation use
that selected value. Target is not in external puzzle exports/history. Emit optional target on
tune events. Reports retain raw and analytic positions with MS02's null reasons; no reachability claim.

### Anchors at `2c665bb`

| File:line / quote | Change |
|---|---|
| `generator/js/engine/digger.js:652-703`, `function removalObjective` | Discriminated objectives |
| `generator/js/engine/digger.js:719-785`, `function* digGuidedSteps` | Initialization/pool/apply |
| `generator/js/engine/digger.js:1100-1147`, `function refineDown` | Entered refinement only |
| `generator/js/engine/digger.js:1313-1347`, `function searchStrategy` | Preserve originating target |
| `generator/js/engine/digger.js:1661-1701`, `let attemptBest = null` | No later redraw |

## Files to create/modify

- `generator/js/engine/digger.js`, `pipeline.js`; `generator/tests/soak.js`, diagnostic helper/suite.
- Digger/target/floor/pipeline/event/explain/help suites; Generator `locale.en.js`, `locale.vi.js`,
  help/explain data only for changed facts (including `explain.dig.code.deeper` and relevant `dig.*`).
- E GG/GR fixtures; `generator/design.md` 6.8/7.2/15.3; both user/developer guides and v3 notes.

## Implementation steps

1. Thread the one target through every listed context, stored candidate and worker path.
2. Wire guarded objectives and the tested comparison/apply policy; keep proposals numeric in traces.
3. Connect refinement/local ranking atomically, retaining first-exact outer stop.
4. Add diagnostics/messages and controlled branch tests, then sync/cooperative parity.
5. Refresh E and docs. Do not claim distribution improvement before MS06d measures it.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS06c-B01 | One raw-band target steers all three stages with requiredness first |
| MS06c-B02 | No new post-exact search, budget expansion or attainable-subrange draw |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS06c-T01 | Original target survives attemptBest, later RNG, keeper, pipeline and wire |
| MS06c-T02 | Initialization counted once; numeric trace operations and refusal pruning preserved |
| MS06c-T03 | 64-rating cap, shallow continuation, sign guard, ties and parity are tested |
| MS06c-T04 | Both quick sets and explained E refreshes pass |

## Test plan and gates

Extend MS06b vectors with a scripted 1100->920(required)->880(required) refinement toward 850;
reject 840(shallow), under-minimum and non-improving reveals. Initially exact 920 does not start
polishing. Test explicit null, all-refused pool, no groups, clue floor, proposal handover, and
attemptBest from an earlier sample. Do not use the already-passing six-Hard-seed histogram as proof.

Generator: `node tests\node-runner.js --suite=digger-target,digger,difficulty-floor,pipeline,events,replay,steps`.
Both quick sets. Complete E, task MS06c:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS06c\hashes\classic4-veryEasy-00.json
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS06c\wire\G09.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS06c\analysis\G01.json
```

Jobs=1, no --jobs; 1-120 seconds/shard, 10-90 minutes E estimate. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** Ten-minute command ceiling.

## Definition of done & handoff

MS06d receives the final source and no-override target policy. Report all changed paths, vectors,
E differences and null-target structural cases; no hit-rate claim or task-log edit.

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
