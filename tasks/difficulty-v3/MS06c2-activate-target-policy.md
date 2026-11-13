# MS06c2 — Activate one originating target in every search stage

| Header | Value |
|---|---|
| Depends on | MS06c1 accepted and committed |
| Size / active time | Medium; 50-60 minutes plus GG/GR |
| Owner / milestone | Generator policy; M6c2 atomic full-target activation |
| Authority | R3/R6/R7/R23; FS13-FS16/FS20; S-OD1 sign-pool handoff; AC01 |
| Gates owned | Complete E GG/GR |
| Status | Not started |

## Goal & business context

Seek a reproducible position inside the raw band throughout cells/signs digging, already-entered
refinement and local search. Requiredness wins over cosmetic proximity. Preserve first-exact
outer stopping, all existing caps and the no-clue-additions rule on models with inequalities.

## Scope

In: one production target draw/route; activate the tested pool, refinement and local policies
together; target messages/docs and controlled tests. Out: weights/bands/caps/floors, offer changes,
attainable-only sampling, post-exact polishing, another sign strategy, or performance-budget fixes.
MS06a's immutable before-record and MS06c1's transport API are inputs, not editable evidence.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. Classic IIFEs, both languages for shown text and guides.
No new application file/dependency. Run both quick sets and owned E gates; no guided-only or
sign-only intermediate policy. Use the shared locks for all >10-second commands.

## Inputs & context

R7, verbatim:

> Carry the originating sample's target through guided dig, `refineDown`, `localSearchSteps`,
> `searchStrategy` and `attemptBest`; do not redraw it from the later search RNG.
> Preserve the existing first-exact outer stop. Target propagation applies to already-entered
> stages; it introduces no unconditional post-exact polishing search.

### Single draw and the strategy route (FS20)

In the existing sample loop name the same RNG that was previously passed inline:

```js
const sampleRng = rng.fork('dig#' + attempt + '.' + t);
const target = targetPolicy.targetFor(spec, sampleRng);
// Pass sampleRng unchanged to digLevelSteps and target in that call's options.
```

`targetFor` returns null for `spec.max === Infinity`; otherwise it returns
`spec.min + sampleRng.fork('target').next() * (spec.max - spec.min)`. No raw-band truncation,
rounding or independent target in another stage. `fork` is seed/tag-based and does not advance
the random/guided parent streams.

The exact route is:

```text
sample loop's target
 -> digLevelSteps options.target
 -> resolved.target (MS06b's hasOwn forwarding)
 -> selected strategy options.target, including registered "signs"
 -> cells guided context / Greater-Than's existing sign-pool comparator
 -> captured keeper view, LevelPuzzle.target, attemptBest.target
 -> search digLevelSteps options.target = attemptBest.target
 -> searchStrategy/localSearchSteps/refineDown context
 -> chosen result, pipeline/wire, optional tune target and soak row
```

Use `Object.prototype.hasOwnProperty.call(options, 'target')`: explicit null is not absent.
For a public/direct dig entry without that property, initialize once with that entry's original
RNG/spec, then pass the property inward before nested entries run. The ordinary sample loop
already supplies it, so it must not be initialized again. A later search always passes the
candidate's property even when null. Do not activate target initialization in an untargeted
Killer structure-only stage; its offers retain null.

No edit to the Greater-Than pool/variant algorithm is required: MS05e already consumes this
option. The strategy caller/forwarding is the only MS06 change to sign digging. Do not add a
current-versus-winner stop to that sign pool; the table below is the cells guided-stage policy.

### Guided objectives and exact stop policy (FS13)

Use the typed results prepared by MS06c1:

```text
{kind:'refused', reason}
{kind:'bounded', score, tierUsed}
{kind:'proposal', priority}
```

For bounded pool candidates prefer `tierUsed:true`; within equal tier state prefer smaller
`abs(score-target)` for a finite target, otherwise higher score. Exact ties keep seeded encounter
order. `tierUsed` is vacuous true for VeryEasy/empty tier or derived from the restricted report's
`techniqueCounts` and `spec.tierTechniques`, never a canonical `requiredOf` certificate.

| Current tierUsed | Winner tierUsed | Apply? |
|---|---|---|
| true | false | never |
| false | true | yes |
| false | false | yes, continue seeking the tier |
| true | true, finite target | only if target distance strictly improves |
| true | true, null target | yes, preserve unbounded digging |

Initialize current bounded state with **one** guarded logical evaluation, retaining
`assumeUniqueness:false` and `OBJECTIVE_STEPS=100000`. Count that call once in the existing
oracle counter and use the inherited budget; do not double-charge it through a second wrapper.
Separate evaluating the current already-unique board from testing a removal's uniqueness:
never pass an undefined removal group into DFS. Refused/capped initialization keeps the input
board and ends this guided pass conservatively; real cancellation/errors propagate.

An all-refused pool continues to the next eligible pool while groups remain; its refusals remain
marked. An empty pool ends. If a successful **bounded winner exists but the apply table says
false**, end the guided pass immediately with the current givens: `break` through the one normal
`trace.pass('guided', 'end', clues)` epilogue. Do not reject only that winner and draw another
pool; do not invent extra rejection records for allowed losers. The pool's ordering ensures no
other member would be applicable. Proposals still maximize their numeric priority, including
`STUCK_SCORE + unsolvedCount`, without comparing it to the target or using the bounded apply table.
Rate/certify/refine proposals afterwards. Every `trace.keep` remains numeric.

### Entered refinement and local acceptance (FS12/FS14/FS16)

`acceptReveal(current,next,spec,target,currentIsExact,nextIsExact)` is the pure MS06b helper.
The caller supplies model-aware canonical exactness. Refinement is entered only above band,
without inequalities. While above band retain the existing solved/`score >= min` reveal rule.
After reaching in-band required, continue only while above the finite target and accept only
an in-band required reveal with strictly smaller target distance, within the **same 64-rating
allowance**. Undo under-minimum, shallow/tier-losing and non-improving reveals.

An already-entered refinement may pass 920 and continue to 880 even though its first exact
offer is now in the keeper; that is not a new local/outer search. A local invocation *entered*
already exact returns immediately with no refinement/proposal. After refinement: exact returns;
in-band shallow adopts the refined givens/rating/clues and rebuilds groups/unit counts/memo;
still-above or unsolved returns without an unproductive proposal tail (MS05b1).

Write the local predicate explicitly, retaining the existing band ceiling:

```js
const accept = next.solved === true && next.score < spec.max &&
  targetPolicy.preferRated(
    quality(next, nextModel), next.score, quality(current, currentModel), current.score, target);
```

Here `quality` is R3/MS05b1's model-aware distance: 0 exact, 0.5 in-band shallow, old off-band
`gap * 1000 + off`, Infinity unrated. Lower quality wins; ties prefer nearer finite target or
higher score for null; exact ties false. Offer every valid completely rated candidate to the
keeper before local acceptance, including rejected above-band or score-decreasing neighbours.
Do not remove that independent best-candidate safeguard to make a local-path test pass.

Keep MS05b1's loop condition:

```text
!isExact(rating, spec.level, model)
&& !(keeper !== null && keeper.distance === 0)
&& !capsExhausted(caps)
&& MS05c's existing local allowance has not stopped this invocation
```

No new proposals after a required current/keeper candidate, no reset of the shallow marker,
no symmetry/clue-floor/sign guard relaxation, and no global cross-sample target tiebreak.

### Test vectors and anchors

Expert band is `{min:700,max:1000}`, target 850. An already-entered refinement:
1100 -> 920 required -> 880 required; reject 880 -> 900 (farther),
920 -> 840 shallow, or a below-minimum 690. A call to `localSearchSteps` with **initially
exact 920** returns without starting refinement, a move or a polishing pass.

Target 500: tier-used 650 beats non-tier 500; tier-used 550/450 tie keeps first; current true
550 -> true 600 ends the cells guided pass; current true -> false ends it too. False/false
650 -> 700 remains allowed. Quality 0/score 430 beats 0.5/500. A local above-band neighbour
of quality 1000 from a below-band state of quality 2000 is still rejected by `score < max`;
observe local accepted-state/log changes separately from the keeper's offer.

| File:line / quote at `c9935cd` (find symbols after MS05/MS06c1) | Change |
|---|---|
| `generator/js/engine/digger.js:671`, `removalObjective` | Separate current evaluation/removal; activate typed comparator |
| `:736`, `digGuidedSteps` | Initialization, pool/apply/end policy |
| `:1232`, `refineDown` | Entered continuation; one 64-rating allowance |
| `:1324`, `const resolved =`; `:1349`, strategy call | Explicit strategy target route |
| `:1459,1469,1481`, `searchStrategy`, `localSearchSteps`, `runLocalSearch` | Preserve collector wrapper/finally; change the inner path predicate, not its work lifetime |
| `:1890,1903`, `attemptBest`, `rng.fork('dig#'` | One draw in each original sample stream |
| `:1927`, `strategy: searchStrategy(attemptBest)` | Pass candidate target, never redraw from search RNG |

The local wrapper now owns `enterLocal`/`leaveLocal` in `finally`; `rateCounted` charges refinement
and continuation into that same collector. Keep all r3 work/allowance tests, including the initially
shallow marker, memo non-charges, exact-at-last-rating stop and error work. The sample/refinement target
must not reset `firstShallowAt`, create a second collector or lose work across pipeline/worker/cache.

## Files to create/modify (exclusive ownership)

- `generator/js/engine/digger.js`; no Greater-Than algorithm edit.
- Existing `digger-target`, `digger`, `difficulty-floor`, `greater-than-guided`, `pipeline`,
  `events`, `worker`, `cache`, `replay`, `steps`, `help` quick suites.
  There is no `explain` suite at HEAD: data/highlight checks are in `events`, card checks in `steps`.
- Generator `locale.en.js`, `locale.vi.js`, help/explain data for changed facts, including
  `explain.dig.code.deeper` and affected `dig.*`/tune descriptions.
- Complete E GG/GR fixtures and intentional replay/steps assertions.
- `generator/design.md` 6.8/7.2/15.3, both user/developer guides and v3 notes.
  MS06c1 owns transport/soak shape; only a tightly coupled correction belongs here.

## Implementation steps

1. Draw/pass the one target in the sample loop; initialize absent direct entries exactly once.
   Preserve null in later search and prove the `signs` caller route.
2. Activate bounded initialization/comparison/apply/end rules; remove the temporary legacy
   numeric adapter introduced by MS06c1, keeping numeric traces.
3. Activate entered-refinement and explicit local predicates in the same change; preserve
   first-exact stopping and every existing guard/allowance.
4. Add controlled integration tests and update EN/VI explanations/guides with no reachability
   claim. Migrate only the preparation-phase assertions from MS06b/MS06c1: an absent direct-entry
   option now yields one initialized target (rather than remaining absent at the strategy),
   normal generation now draws, and default cells need not produce equal puzzles for different
   explicit targets. Retain the explicit 812/null forwarding and all wire/keeper tests; replace
   inactive-policy expectations with active behavior, not deleted coverage.
   Run quick sets and complete E, explaining every changed output.
5. Hand the no-override final source to MS06d; do not tune a distribution before measurement.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS06c2-B01 | One raw-band target steers all stages, including the S-OD1 sign pool, with requiredness first |
| MS06c2-B02 | No post-exact search, budget expansion, partial activation or attainable-subrange draw |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS06c2-T01 | Exact sample-to-strategy/signs-to-selected-result route and inherited search/keeper target are proved, not just field presence |
| MS06c2-T02 | Refused winner ends the cells pass, all-refused/empty pools terminate correctly, initialization is counted once, traces remain numeric |
| MS06c2-T03 | Explicit local ceiling, every refinement vector, 64-rating cap, shallow continuation, first-exact/sign guards and parity pass |
| MS06c2-T04 | Both quick sets and complete explained GG/GR pass; MS06a evidence unchanged |

## Test plan and gates

- Every table row/vector above; cancelled/guarded initialization; no groups/clue floor;
  numeric solved/stuck proposal handover; synchronous/cooperative identity.
- Assert no extra oracle/proposal/RNG draw after a bounded winner is refused by the apply table.
  Keep the current board and exactly one guided end record.
- A later local search starting from an earlier `attemptBest` receives that earlier target,
  even when the most recent sample had another target; structure-only keeper target remains null.
- In `greater-than-guided`, wrap registered `signs` via get/unregister/register in `try/finally`
  for one fixed-seed Greater-Than Expert pipeline request. Delegate to the real strategy.
  Record every invocation's target and check it equals `targetFor(spec, SG.rng.create(rng.seed))`
  computed on a separate test RNG. Multiple attempts are allowed; do not assume one call.
  Associate copied returned/keeper-offered candidate identities with their captured targets;
  the ultimately selected result's target must equal its originating sign invocation's finite
  target, not merely some target in the list. The pool's target-ranking cases remain MS05e's.
- Explicit null on an infinite band draws nothing and keeps higher-score secondary ranking.
  Target child draws do not change parent random/guided draws. Wire/events carry the selected value.

From Generator, under the checklist lock:

```powershell
Invoke-Dv3Node -Task MS06c2 -NodeArgs @('tests\node-runner.js','--suite=digger-target,digger,difficulty-floor,greater-than-guided,pipeline,events,worker,cache,replay,steps,help')
# Complete E, not just these representative shards.
Invoke-Dv3Node -Task MS06c2 -NodeArgs @('tests\perf.js','--hash-key=classic4/veryEasy','--hash-from=0','--hash-count=5','--hash-record=..\docs\difficulty-v3\evidence\MS06c2\hashes\classic4-veryEasy-00.json')
Invoke-Dv3Node -Task MS06c2 -NodeArgs @('tests\replay-fixtures.js','--ids=G09','--record=..\docs\difficulty-v3\evidence\MS06c2\wire\G09.json')
# Publish/check all wire first; only then record and publish/check all analysis.
Invoke-Dv3Node -Task MS06c2 -NodeArgs @('tests\replay-goldens.js','--ids=G01','--record=..\docs\difficulty-v3\evidence\MS06c2\analysis\G01.json')
```

Both quick sets. Jobs 1/no `--jobs`; 1-120 seconds/shard, 10-90 minutes total E estimate,
540-second command ceiling. **Announce to the orchestrator before starting (Pentomino runs
in parallel on the same machine).** No GS yet; MS06d owns the full isolated comparison.

## Definition of done & handoff

Report the route/stop/refinement/local tests, real sign-target connection, unchanged bounds,
all E differences and final source identity. MS06d compares all 17 cells/204 requests and reports
every hit loss; this task makes no unmeasured improvement claim. No Git/pack/log edit.

## Resume rules — S-OD4

Review: analyst cross-review. Stop for correctness/evidence corruption or a recorded-decision change;
time/availability becomes a named numerical item for MS07e then MS18c/MS18d, and work continues.
No new evidence class/tooling task for a slow cell; failed/incomplete checks are never called green.
Use `Invoke-Dv3Node` for every possibly >10-second payload, <=540 s, and r5's complete bounded
quick manifest. Preflight/split the long targeted suite list at existing selector boundaries.
Any authorized new suite owns its r6c CI group/manifest entry as part of this task.
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
