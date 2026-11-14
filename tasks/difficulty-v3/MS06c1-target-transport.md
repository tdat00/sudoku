# MS06c1 — Nullable target transport without policy activation

| Header | Value |
|---|---|
| Depends on | MS06b accepted and committed |
| Size / active time | Medium; 45-60 minutes plus GG check/GR |
| Owner / milestone | Generator plumbing; M6c1 inactive target lifetime and objective types |
| Authority | R6/R7/R23; FS15/FS20; CV6-05 sign-target transport |
| Gates owned | GG check-only; GR deliberate nullable metadata refresh |
| Status | Not started |

## Goal & business context

Prepare the internal data and objective types without changing which puzzle is generated.
MS06c2 can then activate all candidate-comparing stages in one change. Greater-Than's restored
first-allowed sign pass transports the target but has no comparator that consumes it.
MS06a's before-record stays valid: no target is drawn or used for normal production in this task.

## Scope

In: nullable target fields, captured keeper metadata, optional tune-event transport, pipeline/wire/
soak reporting, discriminated objective results with a **behavior-equivalent old ranking adapter**.
Out: new target draws, finite targets from normal callers, new objective evaluations, tier-first
or target-driven selection, refinement/local-policy changes, new caps/weights, exports/history.

Do **not** draw a finite target or send one from a normal caller in this preparation task:
MS06c2 owns both the draw and atomic activation of every candidate-comparing stage. Under
CV6-05 the registered `signs` strategy receives an explicitly supplied option but ignores it;
its keeper offers acquire the originating target through the keeper view below. No edit to
`greater-than.js`, no sign pool and no target-ranking consumer are introduced.

## Repository rules

AGENTS/checklist; no Git, pack or Execution-log edits. Classic IIFEs, no dependencies/new application
script. CRLF/no BOM/final newline/no trailing whitespace. Keep both language guides and Generator
design facts synchronized. Do not deploy the intermediate development branch.

Announce owned gates to the orchestrator first: Pentomino runs on the same machine. Checklist
lock wrapper for >10-second work; jobs 1/no `--jobs`, one bounded invocation at a time.

## Inputs & context

R7, verbatim:

> Carry the originating sample's target through guided dig, `refineDown`, `localSearchSteps`,
> `searchStrategy` and `attemptBest`; do not redraw it from the later search RNG.
> Preserve the existing first-exact outer stop. Target propagation applies to already-entered
> stages; it introduces no unconditional post-exact polishing search.

### Nullable transport, not a new policy

```text
LevelPuzzle.target                    number|null
keeper.best.target / keptPuzzle.target number|null
pipeline result / toWire / fromWire    target:number|null
soak row target                       the selected result's value, not a recomputed draw
optional tune event args.target       finite number|null (schema prepared by MS05a)
```

With normal callers every value is null in this task. An old wire/cache entry without the
field decodes as null; never substitute a midpoint or infer a target from the score. Preserve
explicit zero and null, and copy scalar values into stored candidates at offer time.
The existing MS06b forwarding of an **explicit** `options.target` remains unchanged. No normal
sample loop or direct dig-stage caller starts adding such an option yet.

Keep the target through an explicitly targeted test call's context/result and later search
continuation; production still starts with none. Structure-only offers before any sample have
target null. Global keeper/sample ties retain encounter order and compare R3 quality only:
unrelated samples must not be ranked against one target or each other's sampled targets.

Avoid edits to variant algorithms just to attach metadata. In `digger.js` give each sample/search
context a keeper view that captures its target. It delegates to the original keeper (including
the **model-aware** `closer` delivered by MS05b1) and exposes live `best`, `distance`, `unsound`.
For example `Object.create(keeper)` plus a wrapping `offer` is sufficient for the existing API:
delegate `keeper.offer(Object.assign({}, candidate, {target: capturedTarget}))`. Capture a scalar
for this context, never a mutable global/current-target variable. Original keeper methods retain
their original receiver; no shadow state or duplicate uniqueness check. A structure-search
context retains the original keeper, whose absent candidate target becomes null.

Use the view consistently for initial/proposal/refinement/local/sign offers within the sample.
`createKeeper` stores the candidate's captured value and `keptPuzzle` copies it; selecting a
keeper result must not inherit the last sample's target. This changes neither prefilters,
uniqueness checks, comparison order nor the number of offers/ratings.

### Objective types with identical old semantics

```text
{kind:'refused', reason:'ambiguous'|'techniques'|'tooHard'}
{kind:'bounded', score:finite number, tierUsed:boolean}
{kind:'proposal', priority:finite number}
```

Bounded `tierUsed` is true for a vacuous tier, otherwise any `spec.tierTechniques` ID used by
the same restricted report. It is not `requiredOf` and does not add a floor/canonical solve.
Proposal results remain `kind:'proposal'` even when their below-chain solve finishes: their
priority is that score, or `STUCK_SCORE + unsolvedCount` when it does not finish.

In this preparatory task the guided pool compares only the old numeric value
(`bounded.score` or `proposal.priority`), maximizes it, and retains the first exact tie.
Refusals retain their original rejection reason/mask. `trace.keep` gets the numeric value,
never the object. No new initialization solve and no new comparison to a current objective.
Do not call `preferObjective`, `applyBounded` or `targetFor` from production yet.

### Anchors

Engine anchors at `c9935cd`; use symbols after r5p/MS06b:

| File:line / quote | Change |
|---|---|
| `generator/js/engine/digger.js:671`, `removalObjective` | Wrap results without changing solves/guards |
| `:736`, `digGuidedSteps`, `trace.keep(group, value)` | Read numeric legacy ordering/trace from objects |
| `:1173,1207`, `createKeeper`, `keptPuzzle` | Copy captured target; preserve model-aware quality |
| `:1324`, `const resolved =` | Attach captured keeper/context metadata, preserve MS06b forwarding |
| `:1459`, `searchStrategy`; `:1890`, `let attemptBest = null` | Carry selected target, no draw |
| `generator/js/engine/pipeline.js:307,335`, `toWire`, `fromWire` | Internal nullable field; preserve r3's owned work/localSearches copy |
| `generator/js/engine/events.js`, `TUNE_VERDICT_KEYS` | Prepared optional target schema; no new event kind |
| `generator/tests/soak.js:388-403`, `generateOne` | Read target from both result routes; no attempt override |

## Files to create/modify (exclusive ownership)

- `generator/js/engine/digger.js`, `pipeline.js`; events schema only if the existing optional
  field needs a coupled correction, not a new vocabulary.
- `generator/tests/soak.js`, existing diagnostic helper/suite.
- Existing `digger-target`, `digger`, `pipeline`, `events`, `worker`, `cache`, `replay`, `steps`
  quick suites. No new application source-list entry.
- GR wire/analysis fixtures and directly affected assertions; GG is check-only, never rewritten.
- `generator/design.md` 6.8/7.2/15.3, both developer guides for internal fields; v3 notes.
  No new user-visible targeting claim; user guides change with activation in MS06c2.

## Implementation steps

1. Add nullable internal transport, absent-wire compatibility and captured keeper views.
2. Wrap objectives; keep the explicit legacy numeric comparison and trace behavior.
3. Add transport/lifetime/failure tests, including two suspended contexts with different targets
   and a keeper result from the earlier context. Never mutate the shared keeper's current target.
4. Prove normal production makes no new target draw or sign-target delivery; run quick sets.
5. Run complete GG check-only and GR. Explain only the intended nullable metadata differences;
   a generated puzzle/rating/old-operation change blocks and must be fixed, not refreshed away.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS06c1-B01 | Target metadata cannot be lost or reassigned when a stored candidate wins |
| MS06c1-B02 | No partial sign-only/guided-only targeting changes the before/after comparison |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS06c1-T01 | Explicit number/zero/null and old absent wire survive result, keeper, pipeline/worker/cache and diagnostic routes |
| MS06c1-T02 | Discriminated objectives preserve old solves, priorities, ties, refusal masks and numeric logs |
| MS06c1-T03 | Normal callers draw no target, pass no new finite sign target, and all 520 GG hashes remain unchanged |
| MS06c1-T04 | Both quick sets and deliberate GR pass; no variant algorithm, solver or budget change |

## Test plan and gates

- Script two contexts sharing a keeper: A target 812 offers the eventual winner, B target 915
  later loses; returned target is 812, not 915. An earlier structure-only winner remains null.
  Exercise a cooperative yield before B; no global-variable leak.
- Same quality across unrelated samples keeps the first; no cross-target tiebreak is added.
- Wire/worker/cache: 812, zero, null, old absent field; no reference to a later mutable context.
- Objective parity: refused cases, bounded equal/unequal scores, solved/stuck proposals and
  equal priorities; same old `keep` value and oracle call counts.
- Spy the default sample RNG and `signs` strategy: no `target` child draw/new finite option here.
  The finite real-`signs` transport proof and active-stage acceptance tests are MS06c2's,
  not claimed prematurely. The sign dig itself still does not read the target.
  Label these as preparation-phase assertions: MS06c2 replaces their expected no-draw/legacy
  ranking behavior with the corresponding active-policy tests, while retaining transport coverage.

From Generator, under the checklist lock:

```powershell
Invoke-Dv3Node -Task MS06c1 -NodeArgs @('tests\node-runner.js','--suite=digger-target,digger,difficulty-diagnostics,pipeline,events,worker,cache,replay,steps,help')
# Complete all E GG shards, then check only. Do not use --update-hashes in this task.
Invoke-Dv3Node -Task MS06c1 -NodeArgs @('tests\perf.js','--hash-key=classic4/veryEasy','--hash-from=0','--hash-count=5','--hash-record=..\docs\difficulty-v3\evidence\MS06c1\hashes\classic4-veryEasy-00.json')
Invoke-Dv3Node -Task MS06c1 -NodeArgs @('tests\perf.js','--hash-merge=..\docs\difficulty-v3\evidence\MS06c1\hashes','--check-hashes')
# GR complete E: all five wire IDs G09-G13; publish/check wire before all fourteen analyses.
Invoke-Dv3Node -Task MS06c1 -NodeArgs @('tests\replay-fixtures.js','--ids=G09','--record=..\docs\difficulty-v3\evidence\MS06c1\wire\G09.json')
Invoke-Dv3Node -Task MS06c1 -NodeArgs @('tests\replay-goldens.js','--ids=G01','--record=..\docs\difficulty-v3\evidence\MS06c1\analysis\G01.json')
```

The representative commands do not replace the complete E manifest. Both quick sets pass.
Jobs 1/no `--jobs`; estimate 1-120 seconds/shard, 10-90 minutes total evidence, max 540 seconds
per command. Announce to the orchestrator before starting (Pentomino runs in parallel).
No GS, GH, GD, GQ or GP.

## Definition of done & handoff

Give MS06c2 the typed objective contract, keeper view/transport APIs, unchanged GG result and
explained nullable GR differences. State explicitly: normal target is still absent/null; no
policy is active and no production target is drawn. No task/log/Git edit.

## Resume rules — S-OD4

Review: analyst cross-review. Stop for correctness/evidence corruption or a recorded-decision change;
time/availability becomes a named numerical item for MS07e then MS18c/MS18d, and work continues.
No new evidence class/tooling task for a slow cell; failed/incomplete checks are never called green.
Use `Invoke-Dv3Node` for every possibly >10-second payload, <=540 s, and r5's complete bounded
quick manifest. A long suite list is a coverage selector, not permission to run it unprojected.
If an authorized new suite is needed, own its r6c CI group/manifest entry too.
Return the inherited/new item list and current source/coverage identities.

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
