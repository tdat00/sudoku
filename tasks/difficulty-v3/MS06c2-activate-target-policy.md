# MS06c2 — Activate one originating target in every search stage

| Header | Value |
|---|---|
| Depends on | MS06c1 accepted and committed |
| Size / active time | Medium; 50-60 minutes plus GG/GR |
| Owner / milestone | Generator policy; M6c2 atomic full-target activation |
| Authority | R3/R6/R7/R23; FS13-FS16/FS20; CV6-05 sign-target handoff; AC01; MS06b/MS06c1 reviews IR33/IR34/IR38/IR39/IR41-IR44 and CC02 |
| Gates owned | Complete E GG/GR |
| Status | Not started |

## Goal & business context

Seek a reproducible position inside the raw band through cells guided digging and already-entered
refinement/local search. Greater-Than's first-allowed sign pass transports its target without
consuming it. Requiredness wins over cosmetic proximity. Preserve first-exact outer stopping,
all existing caps and the no-clue-additions rule on models with inequalities.

## Scope

In: one production target draw/route; activate the tested cells-pool, refinement and local policies
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

### Accepted MS06c1 implementation — use it, do not rebuild transport

The accepted implementation exports the following internal seams from `SG.digger`:

| Seam | Existing contract retained by activation |
|---|---|
| `targetPolicy` | Pure `targetFor`, `preferObjective`, `applyBounded`, `preferRated`, `acceptReveal`; callers activate them without changing their tested rules |
| `removalObjective(model, spec, proposal)` | Returns the removal evaluator with typed `refused`, `bounded` or `proposal` results; remove only the temporary numeric ranking adapter |
| `createKeeper(spec, level, budget)` | One original keeper owns state, model-aware quality and uniqueness checks; equal quality keeps the first candidate regardless of target |
| `keeperView(keeper, target)` | A context's scalar target is captured in its `offer`; state stays on the original keeper through the prototype |
| `keptPuzzle(kept, level)` | Copies the kept candidate's target into the returned `LevelPuzzle`; no draw or score-derived replacement |

SA1 accepted all three implementation deviations: those four new function exports; `tune`
verdicts omit `target` when it is null; and the continuation already supplies
`target: attemptBest.target` (null before activation). Keep them. A result/wire/cache/soak
field remains `number|null`; a `tune.hit`/`tune.miss`/`tune.shallow` event carries the field
**only when finite, zero included**, and omits it for null. No event-schema change is needed.

### Single draw and the strategy route (FS20; IR34/IR38/IR39)

**Binding IR39 decision: (b), every sample uses its own target.** A caller's `options.target`
on `SG.digger.generate` or `generateSteps` does **not** suppress or replace that sample's
`targetFor` call, even when it is an own finite, zero or null property. Do not add a
generation-wide test-only override. For an open band `targetFor` returns null without a random
draw; for every actually entered finite-band sample it draws once from that sample's child.
This follows R7 and changes no owner decision.

In the existing sample loop, after its existing early-stop/cap guards, name the same RNG
that was previously passed inline. IR38: `digOptions` copies the caller's options, so the
**last per-sample object must override its target**, without mutating either options object:

```js
const sampleRng = rng.fork('dig#' + attempt + '.' + t);
const target = targetPolicy.targetFor(spec, sampleRng);
const puzzle = yield* digLevelSteps(attemptModel, solution, level, sampleRng,
  Object.assign({}, digOptions, { where: where, caps: caps, proposal: proposal, target: target }));
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
 -> cells guided context; the registered "signs" strategy receives the option and does not read it
 -> captured keeper view, LevelPuzzle.target, attemptBest.target
 -> search digLevelSteps options.target = attemptBest.target
 -> searchStrategy/localSearchSteps/refineDown context
 -> chosen result, pipeline/wire, optional tune target and soak row
```

Distinguish the **lower-level** `digLevel`/`digLevelSteps` entry from the outer `generate`
entry. At the lower-level entry use `Object.prototype.hasOwnProperty.call(options, 'target')`:
explicit zero/null remain explicit, with the accepted invalid-to-null result normalization.
Only a missing property initializes once from that entry's original RNG/spec; pass the effective
property inward before another entry or keeper view is made. Ordinary samples already supply
their drawn property, so the lower-level entry must not draw again.
Direct `digStage`/`digStageSteps` calls do not initialize an absent target; they consume a supplied
one where applicable. Normal production enters those stages through `digLevelSteps`.
A later search keeps the already-built `target: attemptBest.target`, including null; it never
reuses the outer caller's target, the last sample's target or a new `search#` draw. Do not
activate initialization in an untargeted Killer structure-only stage; its offers retain null.

**IR42 — original keeper at every context boundary.** Keep the one original keeper in
`digOptions.keeper`, in the structure hook, and in every sample/continuation's options.
`digLevelSteps` makes that context's view from the original once. Never pass `ctx.keeper`
(already a view) into another `digLevelSteps` or `keeperView`, and do not wrap a view in a
view inside refinement/local search. Within its existing context, offers still use that
context's view. No unwrapping API is needed: preserve the existing root-keeper route and the
two-context/interleaving tests. A structure-search winner keeps null even after later samples
have finite targets.

**No edit to `greater-than.js` (CV6-05).** The first-allowed sign pass compares no candidates
and ignores `options.target`; add no pool, constant or comparator there. Its keeper offers carry
the sample's target through MS06c1's keeper view. On Greater-Than the target acts only in
already-entered local acceptance (`preferRated`) and the `attemptBest` continuation; refinement
is not entered for models with inequalities. R6's pool comparator below applies to cells only.
Do not introduce a cross-sample target tiebreak when preserving `attemptBest`'s originating target.

### IR39 test migration and strict provenance (IR34)

Keep these **three named cases** in `generator/tests/suites/digger-target.test.js`
(accepted MS06c1:1002-1037), replacing their caller-value expectation, not deleting coverage:

| Existing test | Active-policy expectation |
|---|---|
| `generate returns the target of the sample that is the result` | The selected sample's own `targetFor(spec, SG.rng.create(generateSeed).fork('dig#' + attempt + '.' + sample))`, computed on a separate test stream from the known input seed |
| `generate returns the target of the kept candidate that beats its samples` | The originating sample's target, captured by its keeper view; this is not a structure-only offer |
| `generate returns the target of the local search that found the winner` | The earlier `attemptBest` sample's target, inherited by the continuation, with no search-stream draw |

Keep their 812.5/zero/null/absent/NaN **outer caller inputs** and prove they do not override the
sample's target. Compute expected values from separate test RNGs, never by reading the field
under test or advancing the production stream; use the known `generate` seed and literal
attempt/sample fork path, not the production RNG object, for these controlled cases.
Force a controlled multi-sample case with distinct
drawn targets so an earlier winner cannot accidentally inherit the last sample's value.
Keep the independent keeper-view 812/915, zero/null and structure-winner-null cases.

IR34: non-finite targets silently take the helpers' old higher-score/no-target path.
Consequently finite sample origins need exact numeric equality at the strategy, keeper,
continuation and selected-result hops, not mere presence, an in-band check, a coercion to null
or a list-membership test. Verify one target child draw per entered finite-band sample and
none from `search#` or an open band. A legitimate structure-origin result is explicitly null,
not an excuse to allow a lost finite sample target.

Also migrate the coupled default-null assertions introduced by MS06c1:

- `digger-target`: in `digLevel returns the target of its call: a number, zero, null or none (null)`,
  the absent finite-band entry now initializes once; retain explicit number/zero/null and
  invalid-to-null coverage. Replace `the pipeline result and its work stay what they were:
  a request has no target` and the labelled preparation-phase cases with the active expectations.
- `pipeline`: replace `MS06c1: the target of the result is null: no normal request draws one,
  and no event shows one` and `MS05b1-T04: no event carries a target: nothing draws one yet`.
  The explicit-verdict test also calls the outer generator: migrate it to per-sample targets,
  while retaining zero/null/invalid emission checks through the existing lower-level dig entry.
  At that entry absence in a finite band now draws; explicit null/non-finite values still omit
  the verdict field. Keep requiredness, event vocabulary and zero handling strict.
- `worker` and `cache`, the existing `MS06c1-T01` cases: a freshly generated finite-band sample
  has its real target, and serialization preserves it. Finiteness plus strict round-trip equality
  suffices for these non-structure controls; the producer's draw/origin is proved in `digger-target`,
  not derived again here. Keep every explicit-value and old/invalid
  record vector. An old wire still decodes to null: compare it with an expected result whose
  **target alone** is null, not with the newly drawn value. Do not weaken `expectSameResult`
  by removing its strict target comparison.
- `difficulty-diagnostics`, `MS06c1-T01: records the target of the selected result on either
  route, null when it has none`: replace the blanket `[null, null]` for fresh results with the
  actual producer targets on the direct and pipeline routes, allowing genuine structure winners
  to be null. Keep the existing post-return 812.5/zero copy probes and unchanged-puzzle checks:
  they test soak's read-only transport, not a generator-wide target override.

These are activation-coupled migrations in existing suites, not permission to relax nullable
wire/cache semantics, change soak's shape, remove assertions or refresh unrelated expectations.

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
Handle refusals first and seed a pool with its **first successful objective** (IR33).
Only then call `preferObjective` on two successful objectives of the same kind; do not change
the helper to make a success beat an absent/refused incumbent. Keep numeric trace values.

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

| File:line / quote in the accepted MS06c1 source (2026-11-14; use symbols after edits) | Change |
|---|---|
| `generator/js/engine/digger.js:686`, `removalObjective`; `:748`, `objectiveValue` | Retain typed evaluator; replace legacy numeric ranking with the tested policy |
| `:767`, `digGuidedSteps` | Initialization, first-success pool seeding, compare/apply/end policy |
| `:1214,1256,1267`, `createKeeper`, `keeperView`, `keptPuzzle` | Original keeper only at view boundaries; captured scalar and selected-result copy |
| `:1293`, `refineDown` | Entered continuation; one 64-rating allowance |
| `:1372,1390-1408`, `digLevelSteps`, target/view creation and own-property forwarding | Initialize an absent direct target before the view; preserve explicit and supplied sample/search targets |
| `:1480`, `if (target !== null) band.target = target` | Retain finite-only emission, including zero; omit null |
| `:1531,1541,1553`, `searchStrategy`, `localSearchSteps`, `runLocalSearch` | Preserve collector wrapper/finally; change the inner predicate, not its work lifetime |
| `:1823`, `targetPolicy`; `:1887-1889`, `GeneratedPuzzle.target` comment | Activate existing helpers; correct result provenance and the superseded caller-target promise |
| `:1955,1979,2044-2058`, `generateAttempts`, `digOptions`, `attemptBest`, sample call | Draw per sample; last options object overrides the copied outer target |
| `:2079-2083`, search entry and `target: attemptBest.target` | Keep this accepted continuation transport; original keeper, no redraw |
| `:2175-2179`, five internal exports | Use/document the existing seams, no duplicate exports or replacement API |

The local wrapper now owns `enterLocal`/`leaveLocal` in `finally`; `rateCounted` charges refinement
and continuation into that same collector. Keep all r3 work/allowance tests, including the initially
shallow marker, memo non-charges, exact-at-last-rating stop and error work. The sample/refinement target
must not reset `firstShallowAt`, create a second collector or lose work across pipeline/worker/cache.

### Activation documentation and comments (IR41/IR43/IR44)

Update these present-tense statements in the same activation change, in both languages where
applicable. Historical MS06b/MS06c1 evidence remains unchanged.

| Location in the accepted MS06c1 tree | Required replacement |
|---|---|
| `generator/design.md` §6.8 (`:709-723`), including "tested, not wired", "nothing draws or reads a target", "the sample loop draws none and passes none", both strategies ignoring it, and the old numeric adapter | Active per-sample raw-band targets and actual comparing stages; explicit lower-level options versus overridden outer `generate` options; Greater-Than transports only; original keeper views and structure-null provenance |
| §7.2 (`:778`), "only an explicit test call can do" and no normal verdict carrying a target | Normal finite-band verdicts now carry their sample target; finite zero is included and null is still omitted |
| §13.9 (`:1717`), `PuzzleResult.target`, "nothing draws one yet" | Selected sample/search/kept origin, null for open-band or structure-only origins and old wire/cache data; no new config/exchange field |
| §13.13 (`:1760-1772`), `SG.digger` API list (IR41) | Name `targetPolicy`, `removalObjective`, `createKeeper`, `keeperView` and `keptPuzzle`, explicitly internal seams for tests/activation |
| §15.2 (`:1925`), `digger-target` suite row | Replace inactive/old-number/absence claims with the actual activated tests and strict provenance; retain pure-helper and transport coverage |
| §15.3 I4 (`:1973`), "the 520 regression hashes are the same before and after it" | Preserve same-source/seed/options determinism; activation may intentionally change puzzles, recorded and explained through complete E, not an unchanged-hash promise |
| `DEVELOPERGUIDE.md` (`:243`, `:272-293`) and `DEVELOPERGUIDE.vn.md` (`:228`, `:259-281`) | Update the tune paragraph and internal-policy/transport paragraph together: no more "not wired", "nothing draws one", all normal results null, absent direct entries staying absent, or cells ignoring targets. Keep the two languages and §6.8 link aligned |
| `digger.js` inactive comments (`:671-675`, `:1795-1803`) and `GeneratedPuzzle.target` (`:1887-1889`, IR44); `pipeline.js` result comment (`:125-128`) | Replace "comes back as given" and normal-null promises: the result carries its originating sample target through search/keeper, not the outer caller's or last sample's; a structure-search winner has null even on a finite band |

IR44 needs the whole obsolete promise corrected under IR39(b), not only an "unless" clause
that still claims a `generate`-level override survives. No wire/cache/soak schema or puzzle-export
change accompanies these documentation corrections.

## Files to create/modify (exclusive ownership)

- `generator/js/engine/digger.js`, including the existing exports, original-keeper routing,
  preparatory comments and `GeneratedPuzzle.target` comment; **no edit to `greater-than.js`**.
- `generator/js/engine/pipeline.js`: the now-false result comment only; transport implementation
  remains MS06c1's unless a tightly coupled correctness fix is explicitly required.
- Existing `digger-target`, `digger`, `difficulty-floor`, `difficulty-diagnostics`, `pipeline`,
  `events`, `worker`, `cache`, `replay`, `steps`, `help` quick suites.
  There is no `explain` suite at HEAD: data/highlight checks are in `events`, card checks in `steps`.
- Generator `locale.en.js`, `locale.vi.js`, help/explain data for changed facts, including
  `explain.dig.code.deeper` and affected `dig.*`/tune descriptions.
- Complete E GG/GR fixtures and intentional replay/steps assertions.
- `generator/design.md` 6.8/7.2/**13.9/13.13**/15.2/15.3, both user/developer guides and v3 notes;
  include every statement in the activation checklist above.
- `.github/scripts/generator-quick.json`: affected suite counts, measured shard provenance and
  projections under the existing CI contract, including `digger-target` and CC02 below.
  MS06c1 owns transport/soak shape; only a tightly coupled correction belongs here.

## Implementation steps

1. Implement IR39(b): draw/pass the one target in each entered sample, overriding the copied
   outer target; initialize only absent `digLevel`/`digLevelSteps` entries, not raw dig stages.
   Preserve `attemptBest.target`,
   including null, on continuation, always pass the original keeper, and prove the `signs` route.
2. Activate bounded initialization/comparison/apply/end rules; remove the temporary legacy
   numeric adapter introduced by MS06c1, keeping numeric traces.
3. Activate entered-refinement and explicit local predicates in the same change; preserve
   first-exact stopping and every existing guard/allowance.
4. Add controlled integration tests and update EN/VI explanations/guides with no reachability
   claim. Migrate the preparation-phase assertions **and the named IR39/coupled default-null
   cases above**, without weakening transport: an absent direct-entry
   option now yields one initialized target (rather than remaining absent at the strategy),
   normal generation now draws, and default cells need not produce equal puzzles for different
   explicit lower-level targets. Retain the explicit 812/zero/null lower-level forwarding and
   all wire/keeper tests, including the structure-only null winner; replace inactive-policy
   expectations with active behavior, not deleted coverage. Complete IR41/IR43/IR44 documentation.
   Run quick sets and complete E, explaining every changed output.
5. Hand the no-override final source to MS06d; do not tune a distribution before measurement.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS06c2-B01 | One raw-band target steers every stage that compares candidates; the first-allowed sign dig compares none |
| MS06c2-B02 | No post-exact search, budget expansion, partial activation or attainable-subrange draw |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS06c2-T01 | In `digger-target`, each sample's own target overrides any outer caller value, reaches the real `signs` strategy and equals its selected result's originating target; the three IR39 tests, original-keeper/search inheritance and structure-null case remain strict |
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
  Context entries receive the original keeper, never a previously captured view.
  In the controlled context/continuation tests, check each view's prototype against the captured
  original keeper, not another context's view; keep the interleaved scalar-provenance assertions.
- In `digger-target`, wrap registered `signs` via get/unregister/register in `try/finally`
  for one Greater-Than Expert pipeline request, **seed 319, trace off** (CC02). Delegate to the
  real strategy; do not replace the origin proof with a stub or assume the number of calls.
  Record every invocation's target and check it equals `targetFor(spec, SG.rng.create(rng.seed))`
  computed on a separate test RNG. Multiple attempts are allowed; do not assume one call.
  Associate copied returned/keeper-offered candidate identities with their captured targets;
  the ultimately selected result's target must equal its originating sign invocation's finite
  target, not merely some target in the list. This proves transport through the real first-allowed
  strategy and its keeper view, not consumption by a sign comparator. Do not restore the deleted suite.
- Explicit null on an infinite band draws nothing and keeps higher-score secondary ranking
  where candidates are compared; the first-allowed sign dig still ignores the option.
  Target child draws do not change parent random/guided draws. Wire/events carry the selected value.

**CC02 — keep the real route proof cheap and measured.** Seed 319 is selected from existing
`docs/difficulty-v3/evidence/MS05e/before/expert-300-r1.json` and `expert-300-r2.json`, not a new
search: exact, one attempt, two samples, no local search, about 80.8/70.6 ms on the restored
pre-pool source with trace summary. These are historical projections, not an active-source timing
claim. MS06c1's `digger-target` shard measured **1.15 s**, with a **30 s bound**.
Record this task's actual T01 and whole-shard time/count in its existing evidence/CI provenance.
Keep the proof real and the 30 s bound; an unexpected cost is an item for the orchestrator,
not permission to skip it, raise a budget, perform an unbounded seed search or weaken provenance.
Use controlled small cases for the other routing/policy vectors.

From Generator, under the checklist lock:

```powershell
Invoke-Dv3Node -Task MS06c2 -NodeArgs @('tests\node-runner.js','--suite=digger-target,digger,difficulty-floor,difficulty-diagnostics,pipeline,events,worker,cache,replay,steps,help')
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

Report the route/stop/refinement/local tests, real sign-target transport without consumption, unchanged bounds,
all E differences and final source identity. MS06d compares all 17 cells/204 requests and reports
every hit loss; this task makes no unmeasured improvement claim. Include IR39's three migrated
test names/results, IR34's strict provenance, original-keeper routing, finite-only tune targets,
the IR41/IR43/IR44 documentation checklist and CC02's actual shard timing. No Git/pack/log edit.

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
| Status | Accepted (SA1 verdict: accept with a short fix round; fix round applied) |
| Start | 2026-11-14 20:38 (+07:00) |
| End | 2026-11-14 22:43 developer first pass; 22:47-23:03 SA1 implementation review (`claude-opus-5.5/14-review-of-ms06c2.md`); 23:19-23:52 fix round; orchestrator re-check and commit |
| Duration | 2 h 05 min developer + 33 min fix round (complete E, GR re-recorded after the fix round's locale changes, two full quick passes); about 16 min review |
| Model | claude-sonnet-5.5 (developer); claude-opus-5.5 (SA1 review); claude-opus-5.5 (orchestrator) |
| Token usage | 457 model calls; 167,814,406 input tokens (166,208,024 cache reads); 494,625 output tokens |
| AI credits | about 2,558 (developer) |
| Verification | Developer: one production draw per entered sample (IR39(b)), cells pool, entered refinement and local acceptance activated together in `digger.js`; locales EN/VI; tests 3,323 -> 3,346 (`digger-target` 55 -> 75, `pipeline` +2, `replay` +1; IR39 migrations; CC02 T01 on Greater-Than Expert seed 319, 247 ms). Complete E: GG 194 of 520 hashes changed in 20 of 26 keys (the four Very Easy keys and Greater-Than Normal/Hard unchanged by mechanism); GR wires differ by `target` (G09/G10/G13 also in work counters, same puzzles); analyses G01, G04, G05, G06 changed (new puzzles of the same seeds); pins re-derived in `replay`, `steps`, `player`, `replay-recorders`; GR ledgers re-recorded after the fix round's locale/help changes (published fixtures byte-identical). Final quick runs on the final tree, one group per locked command: Generator 3,346/3,346 (`shared-small` 66.5 s, `own-suites` 167.9 s, `pipeline` 322.9 s, `replay-player` 133.4 s; 690.7 s; `6867bdb2…`), Player 1,683/1,683 (`e764236e…`); CI check exit 0. SA1 recomputed the quick fingerprints, both ledger identities and the 194 changed hashes. Orchestrator: locked focused re-runs 579/579 (first pass) and 468/468 after the fix round (`digger-target`, `steps`, `player`, `replay`, `help`, `i18n`); CI check 3,346 of 3,346; `greater-than.js` unchanged |
| Acceptance | MS06c2's criteria met: requiredness wins over proximity at every stage (pool tier before distance; refinement undoes a tier-losing reveal; local search quality first; keeper and final choice by quality); first-exact outer stopping and every cap unchanged; no clue additions on models with inequalities; CV6-05 respected (no `greater-than.js` edit; the sign pass transports, not consumes, the target). Evidence: `docs/difficulty-v3/evidence/MS06c2/` (`evidence.md`) |
| Issues & resolutions | SA1 findings: IR45 (refinement described backwards), IR46 (evidence wording; 17 empty transcripts replaced by real ones through `tee-run.cjs` or dropped as not captured), IR47 (S-AV08 numbers), IR48 (restored-culprit tests used a removed cell: now G07's exchange step, mutation-checked), IR49 (locale "uses"/"dùng", rewraps, help sentence) - all applied in the fix round; also `design.md` row 2065 corrected. IR50: the five developer deviations accepted (an unreachable vector, the dropped hell2 tie test, premise seed 1 -> 5, new specimens, plateau moves no longer followed as specified by FS14 and MS06b's strict `preferRated`). IR51 (info, not done): no test reaches the 64-rating refinement cap; one replay test lost its solver-call total; manual suites not yet run under the new policy |
| Handoff | MS06d: the after-record of all 17 cells against MS06a's before-record; measure the plateau effect (G10 worth watching) and the S-AV08 rise. S-AV08: Generator quick 690.7 s (+40 s over MS06c1: `pipeline` +35.8 s in four puzzle-generating tests, +15-21 %; `mega` +40 %; the 520 regression-hash requests faster, 567 -> 522 s) to MS06d and MS07e. IR51 coverage items for a later test task. Expected per CV6-05: a small or null target effect on the three Greater-Than cells |
