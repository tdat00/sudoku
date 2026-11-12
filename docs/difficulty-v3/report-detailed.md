# Rating v3 — joint implementation report: make Hard require Hard techniques

| | |
|---|---|
| Purpose | Corrected specification and task boundaries from which the developer task pack is derived. |
| Authors | SA2, gpt-6-astra; SA1, claude-opus-5.5. Compiled by SA2; SA1 checked the preceding joint draft. SA1 verified this answers-applied revision (`docs/difficulty-v3/claude-opus-5.5/5-check-of-final-report.md`). |
| Code examined | Branch `rating-v3`, HEAD `6abcb9f`; Windows, Node v26.13.0 locally; Node 24 in CI. |
| Date | 2026-11-12 |
| Status | **FINAL — answers applied (`clarifications.md` at `1398dde`); for acceptance by the owner and the plan author** |

Inputs, all paths relative to this repository:

- `docs/difficulty-v3/plan.md`;
- `docs/difficulty-v3/gpt-6-astra/1-report.md`;
- `docs/difficulty-v3/gpt-6-astra/2-review-of-claude-opus-5.5.md`;
- `docs/difficulty-v3/gpt-6-astra/3-response-to-review.md`;
- `docs/difficulty-v3/claude-opus-5.5/1-report.md`;
- `docs/difficulty-v3/claude-opus-5.5/2-review-of-gpt-6-astra.md`;
- `docs/difficulty-v3/claude-opus-5.5/3-response-to-review.md`;
- `docs/difficulty-v3/claude-opus-5.5/4-check-of-joint-report.md`;
- `docs/difficulty-v3/claude-opus-5.5/5-check-of-final-report.md`;
- `docs/difficulty-v3/clarifications.md` at `1398dde`: every answer in parts A-C, "Part D: author's
  response", and the consolidated decisions in part E. These answers supersede the historical positions table.

The resolution format follows Part I of `docs/generation-steps/report-detailed.md`. This is a new feature
report, not an amendment to that historical implementation record. No application code or generated
test data was changed for this draft. No additional suite or heavy gate was run.

**Change log — 2026-11-12, joint-draft revision:** applied SA1 check C1-C11 without rejection, including ordered certificate
cases, exactness consumers, executable measurement manifests, final-recheck escalation, reference-weight
selection, cage-suite ownership, history compatibility, four-worker qualification and AUTH-S2 (a).
**Change log — 2026-11-12, answers-applied revision:** applied all answers at `1398dde`, including the
owner's full target propagation and measured chain cutoff. Removed unselected contracts; fixed the
cost/limit/reference/publication policies, measurement obligations, task dependencies and traceability.
The preceding protected-label weight-selection proposal is not adopted. SA1's subsequent verification is recorded below.
**Change log — 2026-11-12, SA1 verification (10:50):** SA1 checked this revision against every answer, Part E and
Part F (AC01): signed subject to the editorial corrections V1-V2 of `claude-opus-5.5/5-check-of-final-report.md`;
no resolution changed; AC01 agreed.
**Change log — 2026-11-12, final editorial revision (11:10):** applied SA1's V1-V2, updated both
signatures/statuses and the R7 anchor, and applied N1's timing clarification and N2's combined credit
snapshot. Both analysts signed; AC01 remains open for acceptance in `clarifications.md` part F.

**Reading this report.** FINAL identifies the corrected specification with the recorded answers applied,
not a completed implementation or permission to start it. The owner and plan author must accept this
revision before task-pack work resumes. The existing MS01-MS18 outline below is updated for consistency,
not expanded into executable task packs. Selected measurement rules are final; their not-yet-measured
winning values are not invented. Section 9 records the remaining acceptance concern.

# Part I — Findings and resolutions

## 1. Fixed scope and requirements

The following are not reopened:

1. Implement all S0-S3 work, all six S3 technique groups and S2.3; release rating version 3.
2. An exact puzzle at a nonvacuous level L must defeat the deterministic solver restricted to L's floor.
   One required tier step suffices; there is no "two expensive steps" requirement.
3. Generate toward points inside finite score bands, not systematically toward their upper edges.
4. Keep the existing scoring formula, existing weights and band edges. New-technique weights are the
   listed priors. R20 preserves historical labels and records v3 reclassification without fitting weights
   to those labels. Any weight calibration is a separate, owner-approved rating version.
5. Qualification determines the final offered levels. A shallower puzzle may be an honest approximate
   fallback, never an exact result.
6. All plan-named APPROVAL GATE runs are pre-approved for their owning developer task. Permission to
   run a gate is not permission to change an answered behaviour or weaken a test.
7. One developer owns this checkout at a time. Pentomino is a separate repository and can be developed
   concurrently; timing-sensitive measurements on the shared machine are serialized.

## 2. Baseline and verified findings

### 2.1 Quick baseline

Both analysts independently obtained the same passing counts:

| App / command from its directory | Suites | Passed / failed | Observed runner total |
|---|---:|---|---|
| Generator: `node tests\node-runner.js` | 43 | 2,818 / 0 | SA1 111.2 s; SA2 112.08 s |
| Player: `node tests\node-runner.js` | 29 | 1,609 / 0 | SA1 30.3 s; SA2 24.94 s |

Core tests occur in both counts. These shared-machine observations are not timing gates or statistical
upper bounds. The experimental localStorage warning is not a failure. Details and command timing are
in both independent reports, section 1.

### 2.2 What the current generator produces

The plan's classic9 probe was reproduced by both analysts, seeds 1..N:

| Request | N | Peaks | Score min / upper median / max | In top quarter |
|---|---:|---|---|---:|
| Normal | 12 | nakedPair 5, hiddenPair 4, nakedTriple 3 | 209 / 261 / 315 | 0/12 |
| Hard | 24 | simpleColouring 21, xWing 2, swordfish 1 | 497 / 568 / 699 | 3/24 |
| Expert | 12 | xyWing 12 | 887 / 958 / 989 | 9/12 |

Hard's median normalized position is 0.56; Expert's is 0.86. "Everything hugs the top" is not the measured
baseline. Requiredness changes more than classic9 Hard/Expert:

| Variant | Level | N | Shallow at HEAD |
|---|---|---:|---:|
| classic9 | Normal | 12 | 5/12 |
| classic9 | Hard | 24 | 0/24 |
| classic9 | Expert | 12 | 0/12 |
| classic9 | Master | 12 | 4/12 |
| classic9 | Nightmare | 12 | 12/12 |
| killer | Normal / Hard / Expert | 6 each | 4/6 / 6/6 / 6/6 |
| jigsaw9 | Normal / Hard / Expert | 6 each | 3/6 / 0/6 / 4/6 |
| greaterThan | Normal / Hard / Expert | 6 each | 4/6 / 2/6 / 0/6 |

The extended variant table is SA1's measured corpus; SA2 rechecked representative variant cases.
Sources: SA1 first report section 2.2; SA2 first report section 1.2 and cross-review section 1.2.
The three constructed Easy fixtures are also shallow, but they are fixtures, not a generated Easy sample.

Five of twelve constructed fixtures carrying old family certificates fail the draft's proposed tier
assertion: Normal-1/3 and Nightmare-1/2/3. Their field is `label`, not `level`; old family certificates
are not v3 weight-derived tiers (`generator/tests/fixtures/rated.js:103-179`).

### 2.3 Agreed Nightmare numbers

For the same twelve old classic9 Nightmare boards, maximum chain lengths are
`5,5,5,4,3,6,4,4,4,5,3,5`. The two analysts independently re-scored them:

| Short / long window | Master floor stuck | Exact Nightmare after re-scoring |
|---|---:|---:|
| <=6 / 7-12 | 0/12 | 0/12 |
| <=4 / 5-12 | 6/12 | 2/12 |

For the latter, seeds 1 and 12 score 2253 and 2172. Seeds 2/3/6/10 score 2420/2850/2940/2721:
they become **shallow Hell 1**, not exact Nightmare or exact Hell 1. The six-versus-two disagreement
was a predicate mismatch. S2.1's three order moves did not change this fixed-board result.
It is not a fresh-generation qualification result; S3 will change available proofs.

### 2.4 Main implementation corrections

The score-only exactness tests, keeper ranking, local-search stopping condition, proposal objective,
fixture preprocessing, help examples, replay goldens, history schema and grouped-chain representation
all need coordinated changes. The confirmed canonical-rating prefix proof removes an otherwise expensive
second solve in generation. SA1 measured 96/96 sample agreements at HEAD; SA2
measured 39/39 after in-memory S2.1 moves. The proof and invariant, not those sample sizes, establish
the optimization.

## 3. Resolutions R1-R24

### R1. Bands, allowed sets, floor and tier — FINAL

**Plan:** S0.1. **Task:** MS01. **Clarifications:** SA2-Q-S01; SA1-Q-S2.

Keep the bands `[0,45)`, `[45,180)`, `[180,400)`, `[400,700)`, `[700,1000)`,
`[1000,1500)`, `[1500,2400)`, `[2400,3600)`, `[3600,Infinity)`.

In `generator/js/engine/difficulty.js`, extract `allowedFor(index, variantId)` from `spec`:

```text
allowed(i,v) = registered, weighted, v-applicable IDs with 1.25 * weight < bandMax(i)
              (all weighted applicable IDs at an infinite upper edge), in actual registry order
floor(L)     = [] at index 0; otherwise allowed(index(L)-1,v)
tier(L)      = allowed(index(L),v) minus floor(L)
vacuous(L)   = index(L) == 0 OR tier(L).length == 0
```

Return `allowedTechniques`, `floorTechniques`, `tierTechniques` from `spec`; preserve its other fields.
Use the previous **global** level even when not offered by the variant. Do not call `spec(previous)`,
which may throw. Do not cache against only the level when tests can change weights/registrations.

VeryEasy's actual tier is the three singles; certification is explicitly vacuous. Empty higher tiers
are also vacuous. Vacuous certificates have `required:true`, `floorLevel:null`, for valid inputs.
Easy is not vacuous: singles-only score-46 Easy is a shallow fallback.

With the listed priors, the final classic9 tier inventory is the following derived documentation,
not a second hard-coded policy table:

| Level | Tier IDs |
|---|---|
| VeryEasy | nakedSingle, hiddenSingleBox, hiddenSingleLine; certificate explicitly vacuous |
| Easy | pointing, boxLine, nakedPair |
| Normal | hiddenPair, nakedTriple, hiddenTriple, nakedQuad, hiddenQuad |
| Hard | xWing, skyscraper, twoStringKite, simpleColouring, emptyRectangle, finnedXWing, swordfish, remotePairs, finnedSwordfish, jellyfish |
| Expert | xyWing, xyzWing |
| Master | wxyzWing, wWing, uniqueRectangle, bugPlusOne, xyChain, forcingChain |
| Nightmare | alsXz, sueDeCoq, forcingChainLong, nishio |
| Hell 1 | nishioDeep |
| Hell 2 | empty, vacuous |

Scoped additions are cageCombo/ineqChain at Easy, ruleOf45/minMaxForcing/lawOfLeftovers at Normal,
and cageSplit at Hard, only on the applicable variants. The priors are fixed by SA2-Q-S10 (a);
derive the table from the registry/weights rather than changing the algorithm to fit documentation.

**Alternatives not chosen — SA2-Q-S01 / SA1-Q-S2:** an empty displayed VeryEasy tier, a self-floor,
or an Easy exemption from requiredness.

**Tests/docs:** New `generator/tests/suites/difficulty-floor.test.js`, listed in `generator/tests.html`;
global `describe/it/expect`, not the nonexistent `SG.test.describe/it/assert`. Test set difference,
disjoint union, variant scope, offered-level gaps, VeryEasy and empty tiers. Use variant ID `killer`.
Update `generator/design.md` sections 6.7/13.7 and both developer guides.

### R2. Requiredness APIs and their proof boundary — FINAL

**Plan:** S0.1/S1.1. **Tasks:** MS01 reference API; MS03 prefix activation; MS05 consumers.
**Decision:** SA1-Q-S7 (a), confirmed by the author; SA2-Q-S02 production-cap question withdrawn.

**Common contracts, FINAL:**

```text
FloorResult = { required:boolean, vacuous:boolean, floorLevel:string|null }
ReferenceFloorResult = FloorResult + { unsolvedCount:nonnegative integer }
```

`certifyFloor(model,givens,level,budget)` is the reference implementation for tests, soak and other tools.
It uses only the inherited budget: no new local floor cap and no larger-cap retry. The caller must establish
uniqueness for these exact givens and this exact model, including its cages/signs. It uses
`assumeUniqueness:true`, current default finder options, `collectSteps:false` and R1's floor.
Vacuous returns true/null/0 without a solve. Ordinary SOLVED returns false/0; ordinary STUCK returns
true and the actual remaining count. CONTRADICTION is an invalid-input/technique error, not required.
Cancellation and inherited budget failures propagate; they are not STUCK.

**Derived production certificate.**

Export `requiredOf(rating,level,model)`, pure and without a solve, with cases in this order:

```text
requiredOf(rating, level, model)
  1. rating is null, or rating.solved !== true
       -> null
          // no certificate; never exact; events report required: null
  2. levelIndex(level) === 0, or tierTechniques(level, model.variantId) is empty
       -> { required: true, vacuous: true, floorLevel: null }
  3. otherwise
       -> { required: some id with rating.techniqueCounts[id] > 0
                      is not in floorTechniques(level, model.variantId),
            vacuous: false,
            floorLevel: LEVELS[levelIndex(level) - 1] }
```

Canonical origin (precondition 4) is the caller's obligation: `requiredOf` cannot detect a stale,
imported or restricted report. Callers pass only ratings made by `rateCounted` /
`SG.difficulty.rate` on this model and these givens. Preconditions are:

1. Floor IDs form a prefix of the actual variant-filtered ladder; R8 enforces this, including order ties.
2. Rating and reference refer to the same model/givens, candidate initialization and finder defaults.
3. Both allow uniqueness techniques; finders are deterministic functions of state/options and do not
   change semantics by inspecting the allowed-ID list or previous calls.
4. The rating is one complete `SG.difficulty.rate` result, not a restricted `classify` report or an
   imported/reconstructed claim. Generation already rates through `rateCounted`.

Proof: the two solvers take the same floor steps. At the full solve's first non-floor finding, every
floor finder just returned nothing, so the floor solve is stuck. If no such finding occurs, both solve.
Sources: `core/js/engine/logical-solver.js:238-269`;
`generator/js/engine/difficulty.js:389-451`.

Keep `certifyFloor` for independent checks and noncanonical inputs. Generation runs no second solve,
has no production floor-cap/unverified state, and does not implement `ensureFloor` or the
`rating.floor === undefined` fallback. An absent/unsolved rating still has no certificate. Do not persist
a redundant floor certificate in puzzle exports. The guided oracle uses `assumeUniqueness:false`;
its `tierUsed` remains a steering proxy, never this certificate.

**Alternatives not chosen — SA1-Q-S7 / SA2-Q-S02:** a separate production floor solve, local floor cap
or retry; the reference alone retains the inherited budget.

**Tests:** Equality of the derived helper and the reference after R8 over solved constructed/published fixtures and
small fixed generated variant samples; test the five old shallow certificates, real Normal seed 1,
invalid/unsolved inputs, cancellation, changed cages/signs, and unsupported previous levels.
S0 baseline uses the reference before the prefix invariant exists. Do not assert derived equivalence at
HEAD's known ladder inversion. Update `generator/design.md` 6.7/13.7 and API documentation.

### R3. Exactness, keeper and acceptance ordering — FINAL

**Plan:** S1.1. **Task:** MS05.

```text
isExact(rating,L,model) =
  rating exists AND rating.solved === true AND rating.level === L
  AND requiredOf(rating,L,model)?.required === true
```

Vacuity is explicit; callers enforce R2's canonical-origin contract, so an imported/stale summary is
not accepted as evidence. Missing or unsolved ratings never pass. The existing mathematical
uniqueness guarantee is still required before publication. Update `digLevelSteps`, `keptPuzzle`,
local search, refinement and outer generation exits, not just the first sample.

Keep the current level-gap distance for off-band solved results; unsolved is Infinity.
In-band certified-required is 0; in-band proved-shallow is 0.5. Compute this final distance from
canonical counts before every keeper prefilter, including `closer`; the keeper still executes
`countWithin(...) === 1` before storing. There is no separate solve or optimistic certificate rank.
A shallow keeper at 0.5 must admit a required in-band candidate at 0. Strict `<` ties retain the
existing encounter order. If nothing completely rated can be kept, retain the existing no-rated-puzzle
error rather than publishing an invented certificate.

Audit these sites:

| Site | Contract |
|---|---|
| `generator/js/engine/digger.js:919-936, 1223` | Use the secured result's model/givens, including a safety-net replacement. |
| `generator/js/engine/digger.js:1041-1091` | Keeper count, `closer`, stored distance and `keptPuzzle` share the predicate. |
| `generator/js/engine/digger.js:1100-1147` | Reveals preserve uniqueness, not the greedy solver's floor outcome; rate the new state. |
| `generator/js/engine/digger.js:1320-1499` | Use `spec.level`; removals/swaps/sign changes keep existing uniqueness checks. Memo entries bind to the actual model; reset on changed signs. |
| `generator/js/variants/killer.js:824-853, 907-916` | Layout offers cannot borrow counts/certificates from different cages; preserve keeper verification. |
| `generator/js/variants/greater-than.js:396-408` | Exactness binds to the thinned sign model. |
| `generator/js/engine/digger.js:1667-1739` | `keeper.distance===0`, sample exits, final selection and warnings use the same meaning of exact. |

Offer every valid completely rated search candidate to the keeper, even if the local path rejects its
score decrease. A required in-band result must beat a higher-scoring shallow one. An above-band
candidate refined into a shallow band state must not bypass the intended continued-search route.

**Tests:** Scripted keeper strategy: shallow first, then required; required first, then shallow;
equal-distance stable ties; count cutoff/ambiguity; a changed variant model; missing/unsolved ratings
and prevention of stale-rating reuse. Add real small-seed integration and sync/cooperative parity. Do not make this regression
optional or rely on six seeds accidentally reaching it. Files: digger/floor suites and affected
Killer tests. Docs: `generator/design.md` 6.8/13.13.

### R4. Exactness consumers, warnings and events — FINAL

**Plan:** S1.1. **Task:** MS05. **Clarifications:** SA1-Q-S3 / SA2-Q-S06.

- Preserve `difficulty.approximate` for every non-exact returned fallback. Add `difficulty.shallow`
  only for a complete in-band result proved shallow, not for unverified/unrated results.
- Add `tune.shallow`; retain `tune.hit` for exact and `tune.miss` for other misses.
- Extend the three vocabulary argument lists with `required` (true/false/null), and optional finite
  `target`/null for R6 diagnostics. Shallow includes requested/achieved/score/scoreMin/scoreMax and
  sample/maxSamples; hit retains hardestTechnique. Do not print "wanted Hard, got Hard" as the
  explanation of a shallow miss.
- Add matching Generator English/Vietnamese strings. The shallow warning is: "The puzzle is in the
  requested score band but does not need a {level} technique", translated consistently.
  `warningModels` must pass a localized requested-level argument to `t`, not just the key.
  Add `difficulty.shallow` to `WARNING_KINDS` with the existing `approximate` category; it is not an
  unknown warning kind.
- `pipeline.run`, `toWire` and `fromWire` must retain or consistently reconstruct current exactness.
  Adding a direct return field but dropping it across postMessage is incomplete.
- Soak and qualify read the same predicate/field. Invariant I5 becomes "exact implies complete,
  in-band and required". Manual generation hit tests must count `p.exact`, not merely `p.achieved`.

Files: `generator/js/engine/events.js`, `generator/js/engine/pipeline.js`,
`generator/js/ui/result-view.js`, `generator/js/ui/app.js`, Generator locales,
`generator/tests/soak.js`, `generator/tests/qualify.js`, affected event/pipeline/result-view/digger
suites and `generator/tests/manual/difficulty.test.js`.
Sources: `generator/js/engine/pipeline.js:234-254,291-333`,
`generator/js/ui/result-view.js:53-66`, `generator/js/engine/events.js:850-853`.

Three consumers must change explicitly, not merely inherit the new warning:

- `generator/js/ui/result-view.js:165`: replace `exact: requested === achieved` with the result's
  exactness from R4's wire contract.
- `generator/tests/soak.js:226`: replace the pipeline path's score-level comparison with that exactness.
- `generator/tests/qualify.js:170`: require the same exactness in the hit predicate, retaining its
  validity, solved, requested-level and approximate-result guards.

The following are intended test-contract changes owned by MS05, not permission to rewrite unrelated
failures: `generator/tests/suites/result-view.test.js:66` must not equate exactness with a level match;
`generator/tests/manual/difficulty.test.js:1182` counts `p.exact` for its 90% hit test; its I5 assertion
at `:1212` and `digLevel` assertion at `:1363` become "exact implies solved, achieved equals requested,
and required". Re-check final-event exactness at `generator/tests/suites/pipeline.test.js:309,1144`.

**Tests/docs/gates:** True/false/null event cases, localized placeholder, approximate Retry behaviour,
worker round trip, pipeline/soak parity and manual hit counting. Update design 7.2/10.5/13.9/13.13/15.3,
both guide languages. Necessary GG/GR belongs to MS05; no event-schema weakening. MS05 also runs GD
once with `node tests\node-runner.js --suite=difficulty`: I5 and the `digLevel` contract must pass;
hit-rate failures at levels where required puzzles are rare are recorded as intermediate availability
evidence under R24, not fixed by weakening the assertions.

**Alternatives not chosen — SA1-Q-S3 / SA2-Q-S06:** replacing `approximate`, an approximate-only
shallow result, or a new external warning API.

### R5. Continued shallow search and its budget — FINAL measured-selection rule

**Plan:** S1.1. **Task:** MS05, verified again MS18.

Existing bounds remain `CAP_RATINGS=1024`, `CAP_PROPOSALS=32768`, `REFINE_RATINGS=64`,
`UNIQUE_NODES=200000`, `OBJECTIVE_STEPS=100000`. They are not new calibration freedoms.
The ordinary local-search loop continues while not exact and within its existing caps. A null result
from `rateCounted` remains unrated and never exact.

**Decision:** SA2-Q-S12 (c), the R5 protocol approved as written. Both analysts withdrew an unmeasured
hard-coded 128 cap. Until the measurement, use the existing attempt caps only. Measure full ratings spent after first
reaching in-band shallow, further exact-hit frequency, full attempt counts and time on classic9
Normal/Master/Nightmare, Killer Hard/Expert and a Jigsaw sample. Use the same fixed manifests before
and after; memo hits still consume proposal work but not another full rating.

Compare `64,128,256,no additional cap`, one common setting for every level/variant. The extra allowance
counts full ratings inside one local-search invocation after its first valid in-band shallow candidate
(including an initially shallow state); earlier layout/dig ratings do not consume it. Start counting
once and do not reset when the path leaves the band. All work still consumes the enclosing attempt caps.

Selection cells are classic9 Normal/Master/Nightmare, Killer Hard/Expert and Jigsaw Expert: twelve soak
requests per cell per setting, using the route below. Every request counts; timeout/error is a miss.
Choose the smallest finite cap with no exact-hit loss in any cell against no extra cap and a strict
reduction in median full ratings in at least one cell. Otherwise choose no extra cap. Record timings,
work on failed requests and fallback quality too. The rule is decided; its winning number is measured
in MS05, not guessed in this report.

Return the existing best verified candidate at exhaustion. Memo hits consume proposal work but no
additional full-rating allowance. There is one local-search invocation per full-grid attempt today;
the cap is not a hidden new restriction on Killer's earlier layout search.

This measurement does not license swallowing parent cancellation, changing caps by variant, or
labelling a shallow fallback exact. Record the selected number or "none" with the final constants.
**Alternatives not chosen — SA2-Q-S12:** an unmeasured fixed 128 cap or a permanently unmeasured
no-cap policy; no extra cap remains the baseline and a valid measured winner.

**Measurement route shared by R5, R7 and R9.** Use `generator/tests/soak.js`, one shard per
cell, with `--variant=<id> --level=<id> --count=12 --seed=20260101 --no-gate`. The comparison
manifest is the twelve requests derived from soak's default base seed, not literal puzzle seeds 1..12.
A value under comparison is exposed on its owning module and read at run time: R5's additional
shallow cap on `SG.digger` (`Infinity` means none), and R9's short-chain maximum in the chain module.
Soak gains diagnostic overrides like its existing `--weights` and `--bands`
(`generator/tests/soak.js:87-88,147-148`): `--shallow-cap=<n|none>` in MS05 and
`--chain-window=<n>` in MS07. Overrides are off by default and never used for a gate verdict.
MS07 therefore also owns `generator/tests/soak.js`.

Record commands, per-cell exact/shallow/missed counts, full ratings and times in
`docs/difficulty-v3/shallow-cap-<date>.md` (MS05),
`docs/difficulty-v3/target-scope-<date>.md` (MS06) and
`docs/difficulty-v3/chain-window-<date>.md` (MS07).

**Final recheck rule.** MS18 repeats the measurement with the same shards and records it. If the
rule then selects another value than the one in force, MS18 stops before GQ-final and the
orchestrator asks the owner: keep the value, or insert a task that changes it and re-runs GG, GR,
GH and GD before MS18 resumes. MS18 changes no generation or solver logic or tuning constant.
Its qualification-driven support-list and evidence updates remain as specified in R24.

### R6. Guided target, objective shapes and stopping rule — FINAL

**Plan:** S1.2 and S1.1 steering. **Task:** MS06.

Draw one target per sample:

```text
target = null if spec.max == Infinity
       = spec.min + rng.fork('target').next() * (spec.max-spec.min) otherwise
```

The fork must not consume the random/guided parent streams. Carry this scalar through the sample
context; direct `digStage` calls may initialize it when absent. R7 also carries the originating
sample's target into `attemptBest`/search contexts, never redraws from the later search RNG.
Target is not a new puzzle-exchange field.

Use discriminated objective results:

```text
{kind:'refused', reason}
{kind:'bounded', score, tierUsed}
{kind:'proposal', priority}
```

The bounded oracle retains its 100,000-check guard, `assumeUniqueness:false`, score upper bound and
uniqueness-preserving meaning. `tierUsed` is true for a vacuous tier, otherwise any tier ID used by
that report. It is guidance, not R2's certificate.

For bounded pool candidates, prefer `tierUsed:true`; within equal tier state prefer smaller absolute
target distance, or higher score when target is null. Ties keep the first candidate in the existing
seeded pool order. Apply the pool winner using this table:

| Current tierUsed | Winner tierUsed | Apply? |
|---|---|---|
| true | false | never |
| false | true | yes |
| false | false | yes, continue seeking the tier |
| true | true, finite target | only if target distance strictly improves |
| true | true, null target | yes, preserve the unbounded-level digging policy |

No winner after all refusals continues only while finite eligible groups remain; empty pool stops.
Accepted removals reduce clue groups; rejected groups stay rejected. Together with existing guards
this terminates. Do not use the draft's distance-only final condition, which can lose tierUsed.

Proposal mode still maximizes its own priority, including `STUCK_SCORE + unsolvedCount`. Do not
compare that number to a finite score target or disguise it as a bounded score. Rate/certify/refine
the proposal afterwards. `trace.keep` gets the existing numeric score/priority, never an object;
raw dig-log operations remain `accept/reject/keep/pass/reveal`.

Initialize the current bounded objective with one guarded evaluation. Stage A currently returns no
reusable report. A proposal handover is already unique: score it without inventing an undefined
removal group. Account for the added logical evaluation explicitly without double-counting the
bounded objective's existing counter or replacing per-cell uniqueness counts.

**Tests:** Pure comparator seam for each row, equal distance, empty/all-refused pool, clue floor,
infinite target, proposal priorities and independent RNG streams; bounded objective-call counts;
same seed under sync/cooperative execution. The draft's "six Hard seeds not all top quarter" already
passes at HEAD and is not the new-behaviour regression.
Files: `generator/js/engine/digger.js`, digger/floor suites. Update Generator locales
`explain.dig.code.deeper`, relevant `dig.*`, help, design 6.8 and both guides; GG/GR in MS06.

### R7. One target through refinement and local search — FINAL

**Plan:** S1.2, including refinement. **Task:** MS06; final comparison MS18.
**Decision:** the owner selected the former branch B in SA1-Q-S4 / SA2-Q-S03.

Carry the originating sample's target through guided dig, `refineDown`, `localSearchSteps`,
`searchStrategy` and `attemptBest`; do not redraw it from the later search RNG. Preserve requiredness,
existing uniqueness checks, symmetry, clue floors, caps and the Greater-Than prohibition on adding
clues that make its sign structure redundant.

- While above band, refinement first seeks a valid in-band result. Once in-band required, it may
  continue while above target, accepting only a solved, in-band, required reveal with strictly
  smaller target distance, within the **same 64-rating cap**. Reject and undo tier-losing,
  below-minimum or non-improving reveals.
- Local moves rank first by R3's verified band/exactness quality, then by target distance for equal
  quality. A required in-band candidate beats a shallow one even at a lower score.
- Preserve the existing first-exact outer stop. Target propagation applies to already-entered
  stages; it introduces no unconditional post-exact polishing search. Each sample has its own
  target, and unrelated samples are not compared against a newly drawn common target.
- The target stays uniform on the **raw** finite band. Do not truncate it to an estimated reachable
  interval or change weights to accommodate a low target. A target below the analytic attainable
  lower bound steers toward lower scores, subject to the same finite search and stop conditions.

Report both raw-band position and the position in the author's interval
`[max(min, 1.25 * w_min(tier) + V), max)` as defined in R23. Judge "hugs the top" on the latter, not
on the discarded raw-Expert-median >0.75 trigger. The interval's interpretation and edge cases are
recorded explicitly in the acceptance concern AC01; it is not a new sampling interval.

MS06 compares exact hits and time before/after this target change on **all 17 R23 cells**, using
R5's commands and fixed requests; preserve the pre-change record before editing the objective.
MS18 repeats the final comparison against GS-before and retains the isolated MS06 comparison.
Report a loss of exact hits in any cell to the owner, with counts and timings. Do not silently drop
target propagation or broaden a budget to repair it. Record the comparison in
`docs/difficulty-v3/target-scope-<date>.md`; the owner decides any subsequent change.

**Alternatives not chosen — SA1-Q-S4 / SA2-Q-S03:** guided-only targeting, a conditional 0.75 trigger,
or sampling only an attainable subrange. Full propagation is not conditional on those experiments.

`refineDown`, `localSearchSteps`, `searchStrategy`, sample contexts and `attemptBest` need coordinated
edits; local search has `spec.level`, not a free `level` local. A shallow refinement must not escape
further search merely through the current early return at `generator/js/engine/digger.js:1342-1347`.
Tests must retain the original target through a later search, distinguish same-quality target
improvement from raw score-nondecrease, and show that a closer-but-shallow reveal cannot replace an
exact result. Cover the 64-rating cap, first-exact outer stop and Greater-Than guard. Compare hit rates
and costs, not just medians.

### R8. Monotone orders and deterministic finder work — FINAL

**Plan:** S2.1. **Task:** MS03, before S1 acceptance. **Clarification:** PROC-S1.

Change orders, not weights: `cageCombo 55->44`, `ineqChain 65->46`, `jellyfish 160->137`.
Assert adjacent nondecreasing weights over the registry's actual sorted sequence, including ties.
Preserve calibrated tie outcomes: ineqChain over pointing, nakedQuad over ruleOf45, jellyfish over
cageSplit. Raw baseCost need not be globally weight-monotone; existing costs already differ.

Keep historical fixture `after` arrays/`LADDER` frozen. Introduce a separate current registry-order
expectation; do not rebuild old proof positions under a changed preprocessing ladder.

Reset/localize the subset enumeration's operation-spacing counter at each finder call, not after
each selected combination. Its current persistent `nodes` at `core/js/engine/tech-subset.js:48,136`
already affects `OBJECTIVE_STEPS` at `generator/js/engine/digger.js:641,679-697`. Add identical-result
and identical-check-count tests after unrelated preceding solves; this is not only a hypothetical
second-floor-solve issue.

**Pinned coverage:** `core/tests/suites/techniques.test.js:41-43`,
`core/tests/fixtures/techniques.js:33-45`, `core/tests/suites/tech-fish.test.js:676-687`,
`generator/tests/manual/killer.test.js:511,525`,
`generator/tests/manual/greater-than.test.js:417-424`,
`generator/tests/manual/difficulty.test.js:735-747`, and
`generator/tests/suites/technique-weights.test.js`.
Both apps' hints share the ladder. Own necessary GG/GR/GH/GD; update source headers, design 6.6/6.7
and both developer guides.

### R9. Short/long chains and shallow/deep Nishio — FINAL measured cutoff

**Plan:** S2.2. **Task:** MS07; final verification MS18.
**Decisions:** SA1-Q-S1 (c), approved by the owner; SA2-Q-S04 (b), confirmed by the author.

| ID | Weight | Order | Window |
|---|---:|---:|---|
| forcingChain | 1100 | 190 | 1..C links |
| forcingChainLong | 1400 | **198** | C+1..12 links |
| nishio | 1700 | 200 | depth 1 |
| nishioDeep | 2600 | 202 | minimum 2; default maximum 2, explicit maximum 3 |

Use final order **198 from MS07**. Leaving long at 192 until MS16 makes the first ALS-XZ registration
at 194/1250 violate monotone weights in MS15. Moving it now changes no relative order at S2.2.

On the MS07 code compare **C=4 and C=6**, each on twelve fresh Nightmare requests of classic9,
diagonalX and jigsaw9: 36 requests per cutoff. Use R5's soak manifest, diagnostic overrides and record,
with identical budgets and configuration. Every request counts; timeout/error is a miss. Select the
cutoff with **more exact hits in total; C=6 on a tie**. Report each variant, timings and shallow
outcomes separately. Run GQ-first only after the selected default is in force without an override.

Re-run the same comparison after all S3 work in MS18, under R5's final recheck rule. If it selects the
other cutoff, stop before GQ-final for the owner's keep/change decision and an explicitly inserted
implementation task with GG/GR/GH/GD. Fixed-board re-scoring remains additional evidence, not the
selection denominator or qualification. No winning cutoff is claimed before measurement.

**Alternatives not chosen — SA1-Q-S1 / SA2-Q-S04:** fixing 4 or 6 without the experiment, enabling
depth 3 by default, or introducing a separate depth-3 ID.

**Wrapper contract:** search the shortest represented proof, enforce the inclusive window inside each
ID, and intersect its maximum with a caller's explicit valid maximum. A larger override never enlarges
the registered ID's window. Long/deep called alone must not relabel a short/shallow proof. Preserve an
unregistered general-search seam for existing >12-link algorithm tests. Default depth 3 is not enabled.
Budget/operation exhaustion is not permission to publish a partially searched "shortest" proof.

`length` counts edges; for two-path findings it is their maximum length, not sum.
Parameterize the hard-coded Finding ID and explanation prefix at
`core/js/engine/tech-chain.js:380-385`.
Both apps need `technique.<id>`, `.desc`, and the three chain keys
`.step.endpoints/.step.contradiction/.step.forced`; Nishio IDs need their `.step`.

Tests: C/C+1/12/13 boundaries, depths 1/2/3, short proof alongside a long one, each ID alone,
invalid/off/oversized overrides, cancellation, exact ID/key and generic/partial-unit soundness.
Update `core/tests/suites/tech-chain.test.js:124-185,818-920`, R10's fixture/help bundle and design
6.6/13.6. Own GG/GR/GH and the first GQ/GD checkpoint.

### R10. Common technique, registration and integration contract — FINAL

**Plan:** Every S3 group and S2.2. **Tasks:** MS07-MS16.

Every finder reads state and returns null or one deterministic nonempty Finding:

```text
{
  technique:id,
  cells:number[],                    // pattern/proof cells
  placements:[cell,digit][],
  eliminations:[cell,digit][],
  i18nKey:string,
  i18nArgs:plain cloneable data
}
```

Use sorted/deduplicated new pattern outputs, actual peers and complete units for every
"digit must occur" argument. Digits are 1..model.digits; do not encode all board cells in a 32-bit mask.
Call `ctx.check()` in costly loops. Cancellation/non-budget errors propagate. Local search exhaustion
can lose deductions, never create an elimination or false contradiction. No stale state-identity cache.

Register `id,group,baseCost,order,i18nKey,variantScope,assumesUniqueness,find`, and add its weight in
`generator/js/engine/difficulty.js` in the same change. The final catalogue is 40 IDs, 34 unscoped:
26 existing + 2 split IDs + 12 S3 IDs, with no duplicate cageLocked.

Franken/mutant fish, aligned pair exclusion, death blossom and ALS-XY-Wing remain outside this
catalogue; Medusa/X-cycles/AIC are not separate IDs. The limitations documentation must not promise
that bounded chains or depth-limited Nishio find every elimination of an omitted technique.

**Raw base costs — SA2-Q-S08, table B selected by the author.** Keep every existing cost; use the
following positive costs for new IDs. ALS uses the existing group `chain`.

| New ID | Weight | baseCost |
|---|---:|---:|
| lawOfLeftovers | 200 | 20 |
| skyscraper | 330 | 33 |
| twoStringKite | 340 | 34 |
| emptyRectangle | 380 | 38 |
| finnedXWing | 400 | 40 |
| remotePairs | 440 | 44 |
| finnedSwordfish | 480 | 48 |
| wxyzWing | 800 | 57 |
| bugPlusOne | 920 | 72 |
| xyChain | 1000 | 82 |
| alsXz | 1250 | 106 |
| sueDeCoq | 1300 | 112 |
| forcingChainLong | 1400 | 118 |
| nishioDeep | 2600 | 210 |

These are solver raw costs, not v3 rating weights. They preserve nearby existing raw-cost ranges;
calibrated scoring still uses `WEIGHTS`. Raw solver hardestTechnique may differ. Do not add a global
raw-cost monotonicity assertion: existing jellyfish=56 and xyWing=48 already violate one.
**Alternatives not chosen — SA2-Q-S08:** uniform weight/10 for all new IDs or a new `als` group.

**Bounded-search policy — SA2-Q-S05 (a), starting values approved by the author.** Use documented,
common, deterministic per-call bounds, the same on every board, not unbounded scans or hidden
board-dependent cutoffs. The approved starting values are:

```text
max ALS cells = 4
max retained ALS records = 4096
max work units per new pattern finder = 50000
max selected leftover units per side = 2
max leftover difference cells per side = 4
max additional grouped graph nodes = 4096
```

A work unit is a tested combination extension, ALS pair, assignment extension or graph edge expansion;
document the relevant counter in each module and reset it per call. Check the parent budget at least
every 256 units and at entry. Return null if a complete support/minimum-proof test cannot finish;
never interpret a truncated support table as absence. Retained ALS records are individually complete
valid sets; a bounded prefix may be used for constructive ALS proofs.

The task introducing a finder measures cap hits and latency and may change its own new limit **once**,
with before/after evidence and the chosen value recorded in that task's record and the v3 notes.
This permission does not change weights, bands, existing digger caps or another task's bounds.
After MS17 the resulting pattern limits are part of rating version 3; changing them requires a new
rating version. "Full scope" means every named technique, not exhaustive logical coverage.
**Alternatives not chosen — SA2-Q-S05:** exhaustive or board-dependent searches; unrecorded or
post-freeze limit tuning is not authorized.

**Mandatory integration for each ID:**

- Both apps, both locales: name, description and actual subtype step keys.
- Use existing localized digit argument names `digit`, `digitX`, `digitY`, `digits`, `forced`,
  `partDigits`, or extend the digit-formatting tests/consumers for another numeric digit field.
- Two real positive exact-Finding fixtures and one negative per new unscoped ID; explicit scoped
  positives/negatives for lawOfLeftovers. Add deterministic rare-pattern firing cases rather than
  weakening the random sweep's coverage assertion.
- Independently verify eliminations against complete solutions of bounded fixtures; uniqueness
  patterns additionally require a genuine uniqueness proof. Merely having one known solution is not
  a uniqueness argument.
- A real Player help example per ID, current hint replay, catalogue and locale parity tests.
- Preserve historical fixture preprocessing; maintain a separate current registry list and the
  expanded uniqueness-dependent list `{uniqueRectangle,bugPlusOne}`.

The exact shared file bundle and eight source lists are in section 5. All new-technique tasks own
their affected GG/GR/GH, docs and generated expectations, not a later "cleanup" task.

### R11. Skyscraper, two-string kite and empty rectangle — FINAL

**Plan:** S3 group 1. **Task:** MS08. **File:** `core/js/engine/tech-fish.js`.

| ID | Order / weight / group | Constructive proof contract |
|---|---|---|
| skyscraper | 112 / 330 / fish | Two disjoint complete parallel lines, exactly two candidates for d in each. One endpoint pair shares an orthogonal line; the other endpoints differ. At least one of the latter is d. Eliminate d from external candidates seeing both. |
| twoStringKite | 114 / 340 / fish | A complete-row conjugate pair and complete-column conjugate pair, four distinct cells. One endpoint of each is in the same box and conflicts; at least one remaining endpoint is d. Targets see both remaining endpoints. |
| emptyRectangle | 124 / 380 / fish | A complete box's candidates split into disjoint nonempty row/column arms A/B, empty intersection. External conjugate pair p/q has p conflicting with every occurrence in A; then B or q is true. Eliminate only where every B occurrence and q are seen. |

Use model unit metadata/owner tables, not `row*9+column`. For the restricted rectangle form, external
pair cells are outside the box; reject a candidate at the empty intersection and three-line boxes.
Search both orientations/transposes. Preserve existing fish safety for ambiguous overlapping-grid
line ownership (`core/js/engine/tech-fish.js:56-125`). No-box or incomplete-unit models yield no box-based pattern.
The rectangle's grouped implication can be implemented directly before R16's general graph.

Finding arguments identify digit, pattern cells and relevant lines/box; use labels for human cell/unit
text and numeric values for localized digits. Positives include mirrored/transposed layouts; negatives
include overlapping endpoints, partial units, a target missing one group member and multigrid ownership.
Update fish suite, R10 bundle, design 6.6 and both apps' technique help.

### R12. Finned X-Wing and finned Swordfish, including sashimi — FINAL

**Plan:** S3 group 2. **Task:** MS09. **File:** `core/js/engine/tech-fish.js`.
Register `finnedXWing` 126/400 and `finnedSwordfish` 134/480, group `fish`, no uniqueness assumption.

For size n=2/3 choose n disjoint complete base lines and n disjoint covers. Every base candidate
outside the covers is a fin; fins are nonempty and all in one box. A target lies on a chosen cover,
outside the bases, and sees every fin. If no fin is true, the ordinary n-fish fills the covers;
if a fin is true, it excludes the target. This permits a missing apparent corner (sashimi).

Share bounded enumeration where useful but preserve ordinary n=2/3/4 fish outputs.
Arguments include digit, base/cover labels and fin labels. Test one/multiple fins, sashimi,
transpose, off-cover target, split-box fins, missed visibility, partial/overlapping units and ordinary
fish regressions. Use no global single-number cell mask. Own R10 integration and fish documentation.

### R13. Remote pairs and WXYZ-Wing — FINAL

**Plan:** S3 group 3a. **Task:** MS10. **File:** `core/js/engine/tech-wing.js`.

- `remotePairs`, order 132, weight 440, group `wing`: group identical bivalue masks; peer edges
  require alternating assignments. Two-colour consistent components. A nontrivial remote connection
  has at least three edges; a target seeing opposite colours loses both digits. Odd means edges,
  not cells. Reject inconsistent odd-cycle colouring; do not relabel a two-cell naked pair.
- `wxyzWing`, order 155, weight 800, group `wing`: four open cells with candidate union of four
  digits. Exactly one digit z is non-restricted; for each other digit, every pair of its occurrences
  in the four cells is mutually visible. If z were absent, four cells would need three digits each
  usable at most once. Remove z only from external candidates seeing all z occurrences.

Neither assumes uniqueness. Bound quartet enumeration per R10. WXYZ belongs to **Master** because
1.25*800=1000 is not below Expert's upper edge. Arguments use `digits` and `digit` for z.
Tests: odd/even path contrast, two-cell degeneracy, odd-cycle rejection, a valid four-cell pattern,
two non-restricted digits and one missed z occurrence. Add wing fixtures/help/docs with R10 gates.

### R14. Unique Rectangle extensions and guarded BUG+1 — FINAL

**Plan:** S3 group 3b. **Task:** MS11. **File:** `core/js/engine/tech-wing.js`.

Keep uniqueRectangle's ID/order 180/weight 900 and existing types 1/2 before the new subtypes.
Retain `isDeadlyGeometry`/`buildRectangles` (`:349-399`): the digit swap must preserve every relevant
unit. Cages/inequalities exclude the uniqueness argument.

- Type 3: two bivalue floor corners; roof extras form one virtual nonempty subset member in a unit
  containing both roofs. Combine with k other real cells whose candidate union with the extras has
  k+1 digits. Eliminate that union outside the real cells and roofs. The virtual member denotes at
  least one roof extra, not a fixed extra value in both roofs.
- Type 4: a true conjugate link for one deadly digit between roofs in a complete unit removes the
  other deadly digit from both roofs.
- Hidden form: one corner exactly x/y; the opposite corner has conjugate links on x along its row
  and column to the adjacent rectangle corners. It cannot be y, which would force a deadly rectangle.
  Search the transposes and swapped digit roles.

Use subtype keys `technique.uniqueRectangle.type3.step`, `.type4.step`, `.hidden.step` and explanatory
subtype text in both apps/languages. Keep exact ID `uniqueRectangle`.

Register `bugPlusOne`, order 182, weight 920, group `wing`, `assumesUniqueness:true`.
Require one trivalue open cell and every other open cell bivalue. After removing the proposed extra
digit, every unplaced digit in every relevant complete unit has exactly two occurrences; fixed
values are accounted for. The global Boolean structure then admits a solution flip without that
extra digit, contradicting uniqueness. Place the extra digit. Reject cages, inequalities,
unsupported partial constraints, a second trivalue cell, and a merely local "three occurrences" test.

Honor `ctx.assumeUniqueness:false` in all uniqueness finders. Test unique puzzles, geometry/extra-unit
guards, each subtype and BUG near-misses; expand the uniqueness-registry assertion at
`core/tests/suites/techniques.test.js:64-69`. A known completion alone is not enough.

### R15. Restricted XY-chain — FINAL

**Plan:** S3 group 4a. **Task:** MS12. **File:** `core/js/engine/tech-chain.js`.

Register `xyChain`, order 186, weight 1000, group `chain`, no uniqueness assumption.
Strong edges are only the two candidates in a bivalue cell; weak edges are equal-digit candidates
in distinct peer cells. No conjugate-unit strong edges or general multivalue cell edges.
Endpoints have the same digit in distinct cells; a false-to-true path proves their disjunction.
Eliminate that digit from external candidates seeing both.

Use deterministic shortest search with a maximum of 12 edges, intersected with a smaller caller
limit; local operation exhaustion returns no Finding. Return its own ID and explanation prefix.
A common chain builder may be reused with explicit edge filters, not only a renamed general chain.
Test correct endpoint digit, bivalue restriction, a tempting unit-conjugate shortcut, shortest ties,
partial/generic units and cancellation. R10's help/fixture/locale obligations apply.

### R16. Grouped forcing-chain graph and proof representation — FINAL

**Plan:** S3 group 4b. **Task:** MS13.

Current nodes are decoded as `cell*digits+digit`, and paths are singleton triples
(`core/js/engine/tech-chain.js:78-112,353-385`). Replace arithmetic assumptions with canonical nodes:

```text
Node = { cells:sorted unique nonempty cell[], digit }
truth(Node) = at least one listed occurrence is true
```

Singleton candidates remain nodes. Group nodes are current nonempty box-line intersections.
Same-digit weak edges require disjoint groups and conflict between **every** cross-pair.
Same-digit strong edges require disjoint nodes exhausting all current occurrences in a complete unit.
Retain different-digit singleton weak links inside one cell and bivalue-cell strong links.
Never create an implication from one convenient peer pair or overlapping groups.

Use singleton starting nodes for published forced/contradiction deductions; groups may be internal
nodes and endpoint groups. A true multi-cell group is not permission to place an arbitrary member.
An endpoint elimination must conflict with every member of each endpoint group.
Buffers size from actual canonical nodes/edges and R10's checked limits, not the old cell product.

For grouped paths use:

```text
i18nArgs = {
  proofVersion:2, kind, length,
  chains: [ [ {cells:[...], digit, truth:0|1}, ... ], ... ]
}
```

Legacy singleton triples remain readable; pure singleton findings may keep their old representation.
Length remains maximum edge count over paths. `Finding.cells` is the union of proof-node cells.
Each emitted Finding owns copied node/cell/path data, not borrowed mutable graph scratch.
Proof checkers independently validate node truth, strong/weak edge obligations, endpoints and targets.

Update `core/tests/suites/tech-chain.test.js:124-185`, `player/js/ui/play.js:226-245`,
`player/js/ui/i18n.js:240-246` and `generator/js/ui/i18n.js:252-258`.
Format group truth as a disjunction of its member candidates; group false means every member is false,
not a disjunction of inequalities. Label every member, preserve Wordoku/hexadecimal digit display and
highlight all proof cells. Test mixed paths, full-group visibility, overlapping groups, partial units,
legacy paths, retained Finding ownership after another call and attempted arbitrary group placement.

Do not claim complete coverage of all Medusa/AIC/X-cycle eliminations. These names need no separate
ID, but only represented deductions found within the bounded graph/search are covered.
If split into subpacks, keep the new graph inactive until proof consumers and integration are ready.

### R17. Law of leftovers and existing Killer interactions — FINAL

**Plan:** S3 group 5. **Task:** MS14.

Put `lawOfLeftovers` in `core/js/engine/tech-subset.js`: order 87, weight 200, group `locked`,
scope `['jigsaw9']`, no uniqueness assumption.
Compare n disjoint complete rows or columns with n disjoint complete regions. Their digit multisets
contain n copies of each digit; subtract shared cells. The two difference sets have equal **multisets**,
including fixed values, not just equal digit sets.

Within R10's bounds, enumerate candidate-consistent assignments to each difference side, respecting
within-side peers and fixed values. Intersect complete digit-count signatures and retain per-candidate
support. Only a candidate with no support in a matching signature may be removed. Ignoring extra
cross-side constraints is a safe over-approximation. Incomplete enumeration is not no support.
Decline an inconsistent/no-signature artificial state rather than constructing a bogus positive example.

Tests: singleton equality, repeated-digit multiset, fixed values on one side, row/column duals,
wrong unit counts, overlap/partial units and non-Jigsaw scope. R21 supplies region-aware help snapshots.

No new `cageLocked` ID: existing `pointOutOfCage`/cageCombo already implement the ordinary required
digit locked to a unit and the two-cell Killer pair
(`core/js/engine/tech-cage.js:118-139,173-191`;
`generator/tests/manual/killer.test.js:559-574`).
Add quick regression coverage of both in a **new** `core/tests/suites/tech-cage.test.js`; no quick
cage suite exists at HEAD. Build the Killer boards through the core model builder. Both node runners
discover the core suites automatically (`generator/tests/node-runner.js:105`,
`player/tests/node-runner.js:69`); add the suite to `CORE_SUITE_FILES` in
`generator/tests.html:129` and `player/tests.html:135`. If the fixture genuinely needs
Generator-only code, use a new `generator/tests/suites/killer-cage.test.js` listed in
`generator/tests.html`'s `SUITE_FILES` instead. MS14 owns the chosen suite and list changes.
Stronger assignment-derived interaction is not silently added.
**Alternatives not chosen — SA2-Q-S09:** a duplicate `cageLocked` ID or stronger cage pruning beyond
the two already implemented cases.

### R18. ALS enumerator and ALS-XZ — FINAL

**Plan:** S3 group 6a. **Task:** MS15. **New file:** `core/js/engine/tech-als.js`.

Enumerate k open cells within a genuine all-different unit with exactly k+1 candidate digits.
Completeness of the unit is not required for this at-most-once argument. Deduplicate identical cell
sets across units, order them canonically, use R10 limits and cache immutable geometry only.
Candidate-dependent records are recomputed or keyed by exact candidate content.

Register `alsXz`, order 194, weight 1250, group `chain`, no uniqueness assumption.
Choose disjoint ALS A/B and a restricted common digit x whose every A occurrence sees every B
occurrence. For another common digit z, at least one z occurs in A or B: otherwise both ALS would
have to use x, impossible. Eliminate z only from targets seeing every z occurrence in both sets.
Use `digitX`/`digitY` for localized x/z arguments.

Tests: constructive positive, overlap, one missed x cross-peer, missed z visibility, wrong
cardinality, duplicated ALS geometry, deterministic cap behaviour and state immutability.
Add all eight source lists and both HTML core-suite lists. Long-chain order is already 198 from R9;
do not introduce a transient weight-order inversion. Own R10 integration and the ALS cost shard.

### R19. Sue de Coq — FINAL

**Plan:** S3 group 6b. **Task:** MS16. **File:** `core/js/engine/tech-als.js`.
Register `sueDeCoq`, order 196, weight 1300, group `chain`, no uniqueness assumption.

Use this bounded constructive form:

- I: two or three open cells in a line/box intersection.
- A: p-cell ALS in the line outside the box; B: q-cell ALS in the box outside the line.
- A/B digit sets are disjoint and subsets of I's candidate union C.
- `|C| = |I| + p + q`; Z is C minus both ALS digit sets.

A allows at most one I cell to use an A digit; B at most one B digit. Since `|Z|=|I|-2`, all capacities
must be filled. Therefore all A digits are used among A+I in the line, all B digits among B+I in the
box, and every Z digit occurs in I. Eliminate A digits elsewhere on the line, B digits elsewhere in
the box, Z digits elsewhere in either unit; never eliminate from the proving sets themselves.

Tests: two-cell I, three-cell I with Z, overlapping digit sets, wrong cardinality, wrong membership
and variant geometry. Reuse ALS enumeration/limits rather than an unbounded ALS-pair scan.
Add all R10 integration. Verify final order 190/194/196/198/200/202; no late order fix is deferred here.

### R20. Historical certificates and v3 reference labels — FINAL

**Plan:** S0.1 tests; S3 certificate/weight instruction. **Tasks:** MS01, all introducing tasks, MS17.
**Decision:** SA2-Q-S10 (a), selected by the author; the plan's label-preservation weight-fitting
instruction is withdrawn.

Preserve old puzzles, external labels, v2 family certificates and their explicit preprocessing
sets as historical evidence. Never pretend those old certificates were weight-derived floors.
Keep all listed priors. Add separate v3 expectations next to the historical records, for example
`v3Expected: { level, required }`, where `required` is evaluated at that v3 level using R2, not at an
unstated historical level. An unrated expectation has `level:null, required:null`; it is never exact.
Keep current v3 catalogue/family expectations separate from the historical certificate sets.

The three constructed score-46 Easy fixtures are explicitly shallow under v3. A cheaper new named
proof may legitimately lower a former Master/Nightmare label. Record every reclassification, the old
and v3 labels/requiredness, and the causing technique in `docs/difficulty-v3/notes.md`, in the task
that introduces the change. Do not defer quick-breaking expectations to MS17 or change a weight to
preserve a fixture label. MS17 consolidates the final catalogue and reference expectations.

**Alternatives not chosen — SA2-Q-S10:** constrained new-weight fitting to preserve old labels, or
holding this release for a separate calibration. Any later calibration remains a separate decision.

### R21. Golden/example tooling and integration ownership — FINAL; AUTH-S2 agreed (a)

**Plan:** S2.1/S2.2/S3 gates. **Task:** MS04, with affected refreshes owned by each behaviour task.

Build a bounded recorder/checker for the 14 analysis requests in
`generator/tests/fixtures/replay-goldens.js`, using the actual analysis outputs asserted at
`generator/tests/suites/replay.test.js:611-635`. The existing `generator/tests/replay-fixtures.js`
records only four wire snapshots in `generator/tests/fixtures/replay-wire.js`; it is not an analysis recorder.
Keep intentional step-score assertions at `generator/tests/suites/steps.test.js:879-889` in the same
review. Check-mode compares without writing and explains changed fields.

Adapt `player/tests/tools/make-technique-examples.js` to explicit source/ID selection and bounded
stage-1 generation; `--puzzles` currently truncates only stage 2. Use project-relative artifacts and
line-ending-correct output, not `os.tmpdir()`. Curated real puzzles remain the agreed help format.
If an ID cannot obtain a real hint-replay example within the chosen bound, the task stops and reports;
do not remove its assertion or substitute a synthetic candidate-state example.
**Alternatives not chosen — SA2-Q-S11:** unbounded random discovery or a synthetic example format.

Jigsaw is already an input variant. Add `cellRegion` to snapshots and a reconstruction branch in
`player/js/ui/help.js`, reusing `SG.textBoards.jigsawSpec`
(`player/js/engine/text-boards.js:141-160`). Test a genuine Jigsaw example.

`generator/tests/perf.js --update-hashes/--check-hashes` currently processes the full 26x20 hash
corpus before applying measurement filters (`:122-126,195-218,246-247`). Do not claim existing
variant/level flags shard those modes. If bounded recording is needed, preserve all keys/seeds,
support selected complete chunks and checked merge, and fail on missing/duplicate outcomes.

**AUTH-S2 (a), confirmed:** MS04 tooling precedes MS03/S2.1, the first output-changing task.
**Alternatives not chosen — AUTH-S2:** tooling after the order change, even as a combined milestone.

Both quick suites remain green at completed task boundaries. Every introducing task refreshes
affected help examples and goldens. Hashes are also quick-breaking:
`generator/tests/suites/smoke.test.js:17-19,60-64` pins eleven cells. Update intended changes in their
owning task; full hash comparison is additionally mandatory at checkpoints. No blind blanket rewrite.

### R22. Rating/cache version, history and exchange — FINAL

**Plan:** S2.3. **Task:** MS17. **Clarifications:** SA1-Q-S6 / SA2-Q-S07.

- Set `RATING_VERSION=3` in `generator/js/engine/difficulty.js` and cache `SCHEMA_VERSION=3` in
  `generator/js/ui/cache.js`; purge schema 2. All changed acceptance/catalogue behaviour deploys
  atomically with this release, not with old cached puzzles treated as current.
- Cache comparison must include acceptance-relevant current classification, not just same grids,
  score and level (`generator/js/ui/cache.js:277-284`). Use R2's canonical-origin contract; do not
  treat an old imported summary as a new proof.
- New history entries store ratingVersion. Entries lacking it say "made by an earlier version;
  selecting it generates a new puzzle." They are not provably v2 and do not contain the old puzzle.
  Change `generator/js/ui/history.js`, its field reader/writer, locales and tests.
  Keep the history store's `VERSION=1` (`generator/js/ui/history.js:19`): `read` returns an empty list
  for another stored envelope version (`:153-156`), so bumping it would discard existing history.
  Add `ratingVersion` to `STORED_FIELDS` (`:21`, used by `storedEntry` at `:92-98`) and write it for
  new entries; `validEntry` (`:100-103`) must keep accepting entries without it, shown as earlier-version entries.
- Exports continue writing positive ratingVersion. No new external floor certificate is exported.
  Player imports of older positive versions remain compatible. Internal worker exactness follows R4.
- Update current-version assertions at `generator/tests/manual/difficulty.test.js:759-767,1316`;
  inspect `generator/tests/suites/replay.test.js:1601` and other literal 2s for historical/stub intent
  rather than replacing them blindly.

Freeze and record the selected pattern limits as part of rating version 3 in MS17; later changes to
those limits require a new rating version. Exactness is carried in the worker result and the v3 cache,
not the external Player exchange format. Add the two history-note strings in each language.
**Alternatives not chosen — SA1-Q-S6 / SA2-Q-S07:** no history marker, falsely identifying every old
entry as v2, or exporting a floor certificate.

Consolidate `docs/difficulty-v3/notes.md`, before/after findings and `docs/README.md` link.
Update Generator design 6.6/6.7/6.8/13.7/14.3 and the unnumbered "Known limitations and ideas";
14.1 is JSON format, not limitations. Update Player design 6.2/8.3/9/10 for new hint/proof behaviour,
and both language guides. Record the final 40/34 catalogue counts and bounded coverage honestly.

### R23. Baseline/after instrumentation and measurement denominators — FINAL

**Plan:** S0.2. **Tasks:** MS02 baseline; MS05/MS06/MS07 measurements; MS18 matched after-run.

Extend `generator/tests/soak.js` without changing S0's gate/exit policy:

- requested/achieved, solved in-band, exact, shallow, unrated and reference-failure counts with denominators;
- peak-technique histogram and raw/attainable finite-band position deciles/upper median;
- chain-length and Nishio-depth histograms, explicitly counting puzzles versus steps;
- full ratings/proposals, local work after the first shallow band state, cap hits and timings;
- selected targets and target deviations when available; Hell 2 has no finite band position.

Shallow share is over **solved in-band** puzzles, not exact puzzles (which would make it zero after S1).
Before S1, use the reference floor after I1 has established uniqueness. Record old score-only hits
and requiredness-qualified hits separately; compare the latter against the full request denominator.
Afterwards use production exactness and a bounded independent-reference sample to detect disagreement.
Reference work and its failures are recorded separately from generation time; a failed check is not
a stuck-floor proof. Retain every request in hit/miss denominators.

After S2.1, validate R8's prefix invariant before using derived certificates, including after a
diagnostic `--weights`/`--bands` override (`generator/tests/soak.js:147-154`). Reject an override that
breaks the invariant or use the independent reference explicitly; never report unchecked derived
exactness. Approved v3 gates use the fixed weights/bands, not calibration overrides.

**Band positions — owner decision SA2-Q-S03.** For a complete in-band rating of a finite requested
level, record both positions, plus their inputs, using the current variant-filtered tier:

```text
V = SG.difficulty.breakdown(rating.techniqueCounts, rating.empties).empty
wMin = minimum WEIGHTS[id] over tierTechniques(requested, model.variantId)
attainableMin = max(spec.min, 1.25 * wMin + V)
rawPosition = (rating.score - spec.min) / (spec.max - spec.min)
attainablePosition = (rating.score - attainableMin) / (spec.max - attainableMin)
```

The author's formula is retained as written for nonvacuous tiers and positive finite widths.
Give exact and all-in-band cohorts separate counts and distributions; judge "hugs the top" on the
exact cohort's attainable position. Report shallow/out-of-band outcomes and misses separately, never
remove them from the request denominator to improve a hit rate.

This is an analytic lower-bound interval, not a proof that every score in it can be generated.
The score is rounded but V and the lower bound are not (`generator/js/engine/difficulty.js:239-268`);
do not clamp diagnostic positions or alter scores to hide that difference. For vacuous/empty tiers,
unrated/off-band outcomes, nonfinite bands or nonpositive interval widths, emit a null adjusted
position with an explicit reason rather than divide by zero or invent a minimum. Retain the raw
position where it is meaningful. This reporting edge qualification is raised for acceptance as AC01.

The baseline precedes any output/order/counter change. For each selected single variant/level use an
explicit `--count` (for example 12); `--quick` is roughly 700 requests, not a tiny probe, and
`--per-combo=N` multiplies classic9's count by four. Preserve seeds, configuration, source hash,
Node/machine, outcomes and elapsed times in `docs/difficulty-v3/baseline.md`.
`--no-gate` can suppress an exit code, never hide invariant failures.

The fixed GS-before manifest is **17 cells, twelve requests each**: one shard per cell with
`--count=12 --seed=20260101 --no-gate`.

| Variant | Levels |
|---|---|
| classic9 | normal, hard, expert, master, nightmare, hell1 |
| killer | normal, hard, expert |
| jigsaw9 | normal, hard, expert, nightmare |
| greaterThan | normal, hard, expert |
| diagonalX | nightmare |

These cells include every R5 and R9 comparison; R7 uses all 17 cells. MS06 records the isolated
target-change before/after comparison, and GS-after repeats exactly these cells on final
code. If a final support list already hides a listed cell, use the tool's diagnostic
`--include-unsupported` option for that cell rather than silently omit it from the matched manifest.

Matched after-measurements must distinguish target/distribution change from a changed hit denominator.
Unattainable lower bands are expected: an XY-Wing already contributes at least 812.5 before V,
and nishioDeep at least 3250 inside Hell 1. Do not change weights just to make histograms uniform.

### R24. Qualification, performance, records and release checkpoints — FINAL

**Plan:** S1/S2/S3 gates and S2.3. **Tasks:** MS07 checkpoint; MS18 final.
**Clarifications:** PROC-S1 (a), AUTH-S1 (a), SA1-Q-S5 (a), confirmed by the author.

FINAL ordering: baseline/tooling -> S2.1 -> S1 -> S2.2 -> all S3 -> version/final evidence.
First qualification is after MS07/S2.2. Earlier probes are diagnostics. The first checkpoint records
correctness and availability evidence, but does not permanently prune levels before S3 can add the
missing proofs. Soundness failures block progress; measured intermediate availability shortfalls are
recorded as such, not relabelled green or fixed by weakening requiredness.

GQ-first and GQ-final both cover the same 135 cells, in complete variant shards (and finer level
shards when required by the execution bound), with **four worker processes**. The published v2
table used four (`docs/difficulty-rating/qualification.md:32`); p95 is part of the verdict, so record
the job count and do not compare runs with different counts as matched timing evidence
(`generator/tests/qualify.js:31-33`). The first checkpoint writes
`docs/difficulty-v3/qualification-checkpoint-<date>.md` and `.json`, with distinct per-shard files
merged into those complete records; it never writes the live qualification table.

Final qualification covers the full **15 variants x 9 levels = 135 cells**, including currently hidden
levels, not only current offers. The manual report test requires that complete matrix
(`generator/tests/manual/difficulty.test.js:297-317`). The worker already temporarily enables all levels.
Preserve the 40/100-seed protocol: >=36/40 plus p95 passes; 30-35/40 expands to 100 and needs >=90/100;
<30/40 hides. Protocol-proved early hidden stops are valid; arbitrary truncation is not.
Timeouts/errors/misses remain in the recorded denominators. Only final evidence updates support lists.

**Final publication — AUTH-S1 (a).** MS18 first copies the existing v2 live table to
`docs/difficulty-v3/qualification-v2.md`, preserving that historical record. It then updates
`docs/difficulty-rating/qualification.md` in place with the final v3 table and updates the variant
`difficultySupport` lists together. This live table is the explicit exception to the instruction not
to edit dated reports under `docs/difficulty-rating/`. All reader paths stay unchanged.

Accept the offered levels determined by final qualification. Record every level no longer offered in
`docs/difficulty-v3/notes.md`, with hits, request counts and timing evidence, and report it to the owner.
Do not prune from the checkpoint or tune weights to avoid a removal; a later calibration is separate.
**Alternatives not chosen — AUTH-S1 / SA1-Q-S5:** relocating the live table/readers, intermediate
pruning, or performing weight calibration inside this plan.
**Alternatives not chosen — PROC-S1:** S1 before S2.1 or qualification before the S2.2 checkpoint.

Final GP measures 50 runs per offered performance-table cell, records p50/p95/max and the aggregate
published success criterion. Hash mode is not a timing gate. Do not change timing targets merely to
pass; any qualification-authorized target update must follow the existing documented rule and be recorded.

Use explicit variant/level shards and bounded monitored processes. If one cell cannot complete within
the execution ceiling, implement a complete request-ledger/resume path or report it incomplete; do not
drop slow seeds, invent a verdict or substitute `--probe` for qualification. Preserve source/seed identity
and timing protocol when merging shards. New artifacts are project-relative and never temporary-directory
files. No concurrent timing runs with Pentomino.

## 4. Plan errata, including clarification part D

The author accepted all sixteen corrections in "Part D: author's response" at `1398dde`.
They are folded into the resolutions above, not a second selectable design.

| Clarification correction | Corrected implementation |
|---|---|
| D1 | R1/R2/R20: `label`, five shallow old family certificates, actual tier algebra. |
| D2 | R2/R3: canonical requiredness and final keeper distance before every prefilter; independent uniqueness count before storing. |
| D3 | R2/R3: no missing-certificate exactness fallback. |
| D4 | R6: same tier-first stopping policy; proposal priorities are not scores. |
| D5 | R7/R23: raw targets remain uniform; report both raw and analytic attainable-range positions. |
| D6 | R8/R9: all pinned orders; final long order 198 before ALS appears. |
| D7 | R16: grouped nodes need graph/buffer/proof/formatter changes and cannot place an arbitrary group member. |
| D8 | R21/R22 and gate ledger: actual help path; wire versus analysis goldens; manual suites; correct docs section; all source/suite lists. |
| D9 | R8: reset the persistent subset counter; existing objective guard already observes it. |
| D10 | R8/R20: frozen historical preprocessing and separate current registry expectation. |
| D11 | R10/R21: mandatory real fixtures/help, BUG uniqueness list; Jigsaw input already exists, region snapshot/rebuild is missing. |
| D12 | R21: check and refresh affected goldens/steps in their owner task; not every change necessarily alters every golden. |
| D13 | R5: 128 was withdrawn; measure a common cap, existing caps until selected. |
| D14 | R8/R21/R24: orders before acceptance; qualification checkpoints consolidated, quick-breaking hashes/goldens/examples are not deferred. |
| D15 | R2: the UR comment concerns Nightmare's floor, not Master's. |
| D16 | Section 2/R23: retain the measured shallow rates; Hard's old sample was already required. |

The author also withdrew S3's instruction to fit new weights to historical labels (R20), selected
full target propagation without the optional trigger (R7), and clarified the live qualification-table
exception to plan rule 8 (R24). The original plan remains an input record; this report is the corrected
specification for acceptance.

Additional concrete corrections:

- The new quick suite uses global `describe/it/expect`; the variant is `killer`.
- `localSearchSteps` references `spec.level`, not an undefined local.
- `pipeline.run().exact` is absent at HEAD; include its wire path, not only direct return.
- The target seed test already passes at HEAD; use comparator/stop regressions.
- `forcingChainLong` must return its own Finding ID and all chain subtype keys.
- History has no ratingVersion or stored full puzzle today.
- `generator/tests/perf.js` measurement filters do not currently shard hash modes.
- Registering ALS-XZ at 194 while leaving long at 192 breaks the invariant; R9 resolves this early.
- Final qualification must include the complete 135-cell table, and manual hit counting must use exactness.
- AUTH-S2 is agreed (a): tooling precedes S2.1. Task-owned hash updates also remain agreed.

# Part II — Planned execution, not yet authorized to start

## 5. Task breakdown and exclusive ownership

This is the existing outline reconciled with the answers, not a task pack. Task-pack creation,
further subdivision and implementation remain paused until the owner and plan author accept the
reports. No task execution, staging or commit is authorized by this analysis revision.

### 5.1 Shared bundles

Every task updates the live facts it changes in `generator/design.md`, `player/design.md`,
`USERGUIDE.md`, `USERGUIDE.vn.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, and README/index files
only where applicable. These are serial ownership transfers, not parallel edit grants.

Technique integration bundle B:

```text
generator/js/engine/difficulty.js
core/tests/fixtures/techniques.js
core/tests/suites/techniques.test.js
generator/tests/suites/technique-weights.test.js
generator/tests/fixtures/rated.js
generator/tests/fixtures/regression.js
generator/tests/fixtures/replay-goldens.js
generator/tests/fixtures/replay-wire.js
generator/tests/suites/replay.test.js
generator/tests/suites/steps.test.js
generator/js/ui/locale.en.js
generator/js/ui/locale.vi.js
player/js/ui/locale.en.js
player/js/ui/locale.vi.js
generator/js/ui/help.js
player/js/ui/help.js
generator/tests/suites/help.test.js
player/tests/suites/help.test.js
player/js/ui/help-examples.js
docs/difficulty-v3/notes.md
```

New core module source-list bundle L:

```text
generator/index.html
generator/tests.html
generator/tests/node-runner.js
generator/js/worker/gen.worker.js
player/index.html
player/help.html
player/tests.html
player/tests/node-runner.js
```

Also update both HTML test pages' core-suite lists for a new core test file. R10's weights, locales,
fixtures, descriptions and help example land with the corresponding registration. No parallel fixture
or translation agent writes bundle B.

### 5.2 MS01-MS18

S/M/L are about 100-300 / 300-800 / 800-1,600 changed lines including tests, excluding bulky generated
evidence. A task exceeding L is split into sequential subpacks without an intermediate quick-red state.
All rows finish with applicable targeted checks and both quick sets at the completed milestone.
Gates in the next section are pre-approved, not new permission requests.

| ID | Title / resolutions | Depends on | Exclusive implementation/test files beyond live docs and applicable B/L | Gates | Size / acceptance focus |
|---|---|---|---|---|---|
| MS01 | Tier/reference API; R1/R2/R20 | Accepted specification | `generator/js/engine/difficulty.js`, new `generator/tests/suites/difficulty-floor.test.js`, `generator/tests/fixtures/rated.js`, `generator/tests.html`, applicable B | quick | M; no output change, inherited-budget reference, algebra, proof failures, historical/v3 separation |
| MS02 | Baseline instrumentation; R23 | MS01 | `generator/tests/soak.js`, new `docs/difficulty-v3/baseline.md` | GS-before | M; unchanged S0 gate, both position metrics, comparable exactness and fixed 17-cell manifest |
| MS04 | Bounded golden/example/hash tooling; R21 | MS02 | `generator/tests/replay-fixtures.js` or new analysis recorder, `generator/tests/perf.js`/`generator/tests/fixtures/perf-helper.js` if bounded hash support needed, `player/tests/tools/make-technique-examples.js`, `player/js/ui/help.js`, help/text-board tests | recorder check modes; targeted quick | M-L; deterministic baseline parity, Jigsaw reconstruction, no temporary-directory writes |
| MS03 | Monotone orders/counter reset, derived helper activation; R2/R8 | MS04 | `core/js/engine/tech-cage.js`, `core/js/engine/tech-ineq.js`, `core/js/engine/tech-fish.js`, `core/js/engine/tech-subset.js`, pinned core/manual order tests, B | affected GG/GR/GH/GD | M; actual prefix invariant, canonical/reference equality, interleaved-call determinism |
| MS05 | Exactness/keeper/consumers/measured shallow cap; R3-R5 | MS03 | `generator/js/engine/digger.js`, `generator/js/engine/events.js`, `generator/js/engine/pipeline.js`, `generator/js/variants/killer.js` call site, `generator/js/ui/result-view.js`, `generator/js/ui/app.js`, `generator/tests/soak.js` (exactness and diagnostic cap override), `generator/tests/qualify.js`, `generator/tests/suites/result-view.test.js`, `generator/tests/suites/pipeline.test.js`, `generator/tests/manual/difficulty.test.js` (R4's intended assertions), new `docs/difficulty-v3/shallow-cap-<date>.md`, relevant suites/B | affected GG/GR; GS cap comparison; GD once | L; derived required beats shallow, exact wire/view/tool parity, measured common cap, I5/digLevel pass; intermediate availability failures recorded |
| MS06 | One target through dig/refine/local search; R6/R7 | MS05 | `generator/js/engine/digger.js`, `generator/js/engine/pipeline.js` for internal target diagnostics, `generator/tests/soak.js`, digger/floor/pipeline suites, Generator help/locales, new `docs/difficulty-v3/target-scope-<date>.md`, affected B | GG/GR; matched 17-cell GS before/after | L; tier-safe comparator, proposal separation, original target retained, no post-exact polishing; report every cell's hit loss |
| MS07 | Enforced chain/depth IDs and measured cutoff; R9/R10 | MS06 | `core/js/engine/tech-chain.js`, `core/tests/suites/tech-chain.test.js`, `generator/tests/soak.js` (diagnostic window override), new `docs/difficulty-v3/chain-window-<date>.md`, B, new checkpoint evidence | GG/GR/GH; GS window comparison; full hash check, GQ-first/GD | L; ID-alone minimums, default deep depth 2, costs from table B, 36 fresh requests per cutoff, no intermediate pruning |
| MS08 | Skyscraper/kite/empty rectangle; R11 | MS07 | `core/js/engine/tech-fish.js`, `core/tests/suites/tech-fish.test.js`, B | affected GG/GR/GH; bounded limit evidence | L; three proved patterns and near-misses, measured caps; later subdivision only after acceptance |
| MS09 | Finned fish/sashimi; R12 | MS08 | Same fish module/suite, B | affected GG/GR/GH; bounded limit evidence | L; fin visibility, complete/disjoint units, ordinary-fish compatibility |
| MS10 | Remote pairs/WXYZ; R13 | MS09 | `core/js/engine/tech-wing.js`, `core/tests/suites/tech-wing.test.js`, B | affected GG/GR/GH; bounded limit evidence | L; edge parity and restricted-digit proof |
| MS11 | UR extensions/BUG; R14 | MS10 | Same wing module/suite, uniqueness registry tests, B | affected GG/GR/GH; bounded limit evidence | L; unique-proof/geometry guards and every subtype |
| MS12 | XY-chain; R15 | MS11 | `core/js/engine/tech-chain.js`, chain suite, B | affected GG/GR/GH; bounded limit evidence | M-L; restricted edges, endpoint digit, bounded shortest proof |
| MS13 | Grouped graph/proofs/consumers; R16 | MS12 | `core/js/engine/tech-chain.js`, proof checker/chain suite, `generator/js/ui/i18n.js`, `player/js/ui/i18n.js`, `player/js/ui/play.js`, both format/i18n/play tests, B | affected GG/GR/GH; bounded limit evidence; GP shard | L; complete proof validation, measured node/work caps and legacy rendering |
| MS14 | Leftovers/Killer regression; R17 | MS13 | `core/js/engine/tech-subset.js`, subset suite, new `core/tests/suites/tech-cage.test.js`, `generator/tests.html`, `player/tests.html`; R17's Generator-only alternative if genuinely needed, B | affected GG/GR/GH; bounded limit evidence; GD variant selector | L; multiset support, incomplete-enumeration safety, scoped help, explicit new cage coverage |
| MS15 | ALS enumerator/ALS-XZ; R18 | MS14 | New `core/js/engine/tech-als.js`, new core ALS suite, B/L | affected GG/GR/GH; bounded limit evidence; GP shard | L; complete valid ALS records, restricted common candidate, all lists |
| MS16 | Sue de Coq; R19 | MS15 | `core/js/engine/tech-als.js`, ALS suite, B | affected GG/GR/GH; bounded limit evidence | L; capacity/count proof, final order already valid; no unapproved retuning of earlier limits |
| MS17 | v3/cache/history/reference integration; R20/R22 | MS16 | `generator/js/engine/difficulty.js`, `generator/js/ui/cache.js`, `generator/js/ui/history.js`, export only if necessary, cache/history/export/manual version tests, consolidated notes, `docs/README.md`, B | justified GG/GR/GH/GD | M-L; atomic rating/cache 3, history store 1, fixed priors, frozen pattern limits, old imports retained |
| MS18 | Final evidence/support publication; R5/R7/R9/R23/R24 | MS17; chosen MS05/MS07 defaults recorded | `docs/difficulty-rating/qualification.md`, new `docs/difficulty-v3/qualification-v2.md`, new v3 evidence, `generator/tests/qualify.js` timing/report support if needed, `generator/js/variants/*.js` support lists, manual offered-table assertions with unchanged read path, affected B/live docs; no production generation/solver logic or tuning changes | GS-after plus cap/window rechecks, GQ-final, GP, GD, full GG check; final quick | M plus runs; escalate changed selection before GQ-final, report hit losses/removed levels, archive v2 and publish complete v3 evidence |

Recommended order:

```text
MS01 -> MS02 -> MS04 -> MS03 -> MS05 -> MS06 -> MS07
  -> MS08 -> MS09 -> MS10 -> MS11 -> MS12 -> MS13 -> MS14 -> MS15 -> MS16 -> MS17 -> MS18
```

AUTH-S2 (a) and PROC-S1 (a) are confirmed; there is no alternate MS03/MS04 order.
The dependencies include deliberate file-ownership serialization; independent algorithms still share
weights, locales and generated data. The equivalent Pentomino chain runs separately.

## 6. Gate ledger

Commands below use Windows paths. Run from Generator unless the row says Player; output paths are
project-relative. Record source hash, Node/machine, configuration, seed/count, elapsed time, exit code,
changed expectations and the reason. No heavy gate was run by the analysts.

| Gate | Owner | Command / complete outcome |
|---|---|---|
| Quick | Every completed task | `node tests\node-runner.js` in both apps; narrow `--suite=` checks while developing. Do not start simultaneous runs on one checkout. |
| GS-before | MS02 | `node tests\soak.js --variant=<one-id> --level=<one-level> --count=12 --seed=20260101 --no-gate` once per cell of R23's fixed 17-cell manifest; record all invariant failures despite exit suppression. |
| GS selection/comparison | MS05 / MS06 / MS07 | Same one-cell soak command: MS05 runs six cells for each `--shallow-cap=64`, `128`, `256`, `none`; MS06 repeats all 17 cells before and after the target change; MS07 runs three Nightmare cells for each `--chain-window=4` and `6`. Diagnostic overrides never supply a qualification verdict. Record full manifests, ratings, exact/shallow/miss counts and times. |
| GG | Each task whose generated puzzle output changes | `node tests\perf.js --update-hashes`; inspect intentional differences. Full `--check-hashes` at MS07/MS18, plus bounded affected checks where supported. Current measurement selectors do not shard hash mode. |
| GR | Every affected output/solver task | `node tests\replay-fixtures.js`, then `--check`, plus MS04's analysis recorder/checker for all 14 requests and justified step-score expectations. |
| GH | MS03 if order invalidates examples; every new-ID/enhanced-proof task MS07-MS16 | From Player, adapted `node tests\tools\make-technique-examples.js ..\generator` with bounded chosen sources/IDs; then Player help/quick checks. Do not run its old unbounded stage-1 plan blindly. |
| GQ-first | MS07 | `node tests\qualify.js --variant=<ids> --level=<ids> --jobs=4 --json=<checkpoint-json> --markdown=<checkpoint-md>` across all 135 cells in complete shards. Merge into `docs/difficulty-v3/qualification-checkpoint-<date>.json` and `.md`; never write the live table or prune support at this checkpoint. |
| GD | MS03 affected pins; MS05 exactness contracts; MS07 checkpoint; MS14 variant work; MS17/MS18 final | `node tests\node-runner.js --suite=difficulty`; MS05 runs it once, with I5/digLevel required to pass and intermediate hit-rate failures recorded. Affected `--suite=killer,greater-than` are manual suites. Soundness/API failures block; no unrelated blanket `--all` run is inferred. |
| GP | MS13/MS15 cost shards; MS18 final | `node tests\perf.js --variant=<id> --level=<ids> --runs=50 --gate`. Aggregate the full intended matrix; do not confuse a hash-only exit with a p95 gate. |
| GS-after | MS18 | Repeat R23's 17-cell manifest, R5's six-cell/four-setting cap experiment and R9's three-cell/two-cutoff experiment with the same seeds/counts. Report raw and attainable positions, hit losses, targets and shallow/cap rates. Apply R5's escalation rule if a final recheck selects a change; never drop the selected target policy silently. |
| GQ-final | MS18 | Same qualifier command/protocol with `--jobs=4` for all 135 cells, merged with completeness checks. Archive v2 first; publish `docs/difficulty-rating/qualification.md` and the support lists together. Record job count; do not compare timing runs with different counts. |

All test/probe invocations stay bounded; stop and investigate a run exceeding ten minutes rather than
silently discarding it. Total gate work may be much longer across complete shards. If current tooling
cannot split a slow cell safely, that is an explicit tooling blocker, not permission to weaken the
protocol. Preserve every required outcome and cold/warm timing semantics when resuming.

R10's introducing tasks also record deterministic work/cap counts and latency on their bounded
positive/negative fixtures and affected sample inputs. These are measurements, not timing assertions
added to quick tests. A once-only own-limit adjustment is recorded with its resulting GG/GR/GH changes;
MS17 freezes the final values. Do not start a second heavy/timing run while either repository has one.

Tool-written working-tree files follow `.gitattributes`: CRLF generally; the explicit Player export-text
and shell-script LF exceptions remain LF. Do not normalize historical files gratuitously.

## 7. Risks, effort and timing

| Risk | Mitigation / owning resolution |
|---|---|
| False exactness from an assumed canonical origin or different uniqueness options | R2/R3 preconditions, reference comparisons, preserved counts; never use oracle tierUsed as certificate. |
| Sound but incorrectly attributed long/deep proof | R9 ID-alone minimum tests and completed shortest-proof contract. |
| Unsound new geometric/uniqueness deduction | R10-R19 constructive proofs, complete-unit/peer guards and independently checked fixtures. |
| Expensive searches on large/multigrid boards | R10 deterministic limits, per-task cost probes, final GP; bound support enumeration without inferring absence. |
| Nightmare/Hell 1 scarcity and shallow-search cost | Fresh window comparison, R5 work measurements and final qualification; no score-only success. |
| Full target propagation reduces exact hits in a cell | R7's isolated 17-cell comparison and final GS; report losses to the owner, never silently revert to guided-only targeting. |
| "Attainable" overstates reachability or hides rounding/vacuous cases | R23 keeps the owner's formula, explicit diagnostic statuses and both cohorts; AC01 identifies the acceptance qualification. |
| Final S3 measurements prefer another cap/cutoff | R5/R9 stop before GQ-final; owner keeps the value or inserts a separately validated change. Extra work is not hidden in MS18. |
| New cheaper techniques legitimately move old labels | R20 explicit policy, immutable historical records, documented v3 expectations. |
| Hidden integration failures or no bounded real example for an ID | R21 recorder/example work, all lists/locales and task-owned expectations; stop/report a missing real example, do not waive it. |
| Process-history-dependent guards | R8 counter reset and warm/interleaved-worker regression. |
| Cache/history misrepresents changed puzzles | R22 schema/version purge, truthful old-history text, unchanged external legacy claims. |
| Timing conclusions distorted by concurrent work | Separate measurement slots and complete request manifests; record actual conditions. |

Planning allowance for a claude-sonnet-5.5 developer, **agent-hours excluding long gate wall time**:

| Tasks | Agent-hours |
|---|---:|
| MS01 / MS02 | 2-3 / 1-2 |
| MS04 / MS03 | 3-5 / 1-2 |
| MS05 / MS06 / MS07 | 4-6 / 4-7 / 4-6 |
| MS08 / MS09 / MS10 / MS11 | 4-6 each |
| MS12 / MS13 / MS14 | 3-4 / 6-9 / 3-5 |
| MS15 / MS16 / MS17 / MS18 | 5-7 / 3-5 / 2-3 / 2-4 |
| Total | **59-92** |

These are planning estimates, not measured productivity or a promised elapsed delivery. They reconcile
the earlier joint 58-90 agent-hour estimate with the now-required full target propagation and its
17-cell comparison. SA2's earlier 118-187 hours was engineering effort and is not averaged into this
number. Difficult real-example acquisition, bounded-tooling support, a once-only evidenced pattern-limit
adjustment or an owner-requested final re-selection may increase the range.

Measured quick-suite totals are about 111-112 s (Generator) and 25-30 s (Player) at HEAD.
The v2 record reports 1,531 s "in total" for the first 40 requests of every level
(`docs/difficulty-rating/qualification.md:72`); it does not establish wall time with four workers or
include every possible second round. V3 qualification wall time is unmeasured and may be much higher.
Full hash recording checks 520 generated puzzles, twice for update/check; new v3 cost is
not measured. GH, GS, GR and GP durations remain unmeasured. The fixed GS baseline/final manifest is
204 requests per pass; the isolated target comparison adds 204 before and 204 after, the cap experiment
288 per pass, and the window experiment 72 per pass. The latter two repeat after S3. Reuse an existing
measurement only when source, configuration, seeds and timing conditions are identical and recorded.
GP alone requests 50 puzzles per selected performance cell. These runs are serialized with Pentomino,
not parallel wall-time savings. Schedule attached, monitored, complete shards and report actual durations.
No tests or generation probes were run while applying the answers or editorial corrections.
The brief records the orchestrator's approximate combined analysis credits for both repositories;
these are not Sudoku-only costs and are not inferred from the implementation allowances.

## 8. Traceability

### 8.1 Clarification answer to resolution and task

Every answer in `docs/difficulty-v3/clarifications.md` at `1398dde` is represented below.
The owner's two selections and the author's other answers are applied; acceptance is a separate step.

| Clarification ID / confirmed row | Answer applied | Resolutions | Tasks |
|---|---|---|---|
| SA2-Q-S01 | (a): VeryEasy has the singles tier and a vacuous true/null-floor certificate | R1/R2 | MS01/MS03 |
| SA1-Q-S2 | (a): singles-only Easy is shallow, including the three score-46 references | R1/R3/R20 | MS01/MS05/MS17 |
| SA1-Q-S7 | (a): derive requiredness only from complete canonical ratings after the prefix invariant | R2/R3/R8 | MS01/MS03/MS05 |
| SA2-Q-S02 | Production question withdrawn; reference uses inherited budget only, errors propagate | R2 | MS01/MS02/MS03 |
| SA2-Q-S03 / SA1-Q-S4 | Owner: full target propagation, raw-band draw, both position metrics; report cell hit losses | R6/R7/R23, AC01 | MS02/MS06/MS18 |
| SA1-Q-S1 | Owner: compare 4/6 on 36 fresh requests each, more exact hits wins, 6 on tie; final recheck/escalation | R9/R24 | MS07/MS18 |
| SA2-Q-S04 | (b): Nishio depth 1; deep minimum/default maximum 2, explicit maximum 3; overrides cannot enlarge windows | R9 | MS07 |
| SA2-Q-S05 | (a): approved starting bounds, one evidenced own-limit change in introducing task, freeze at MS17 | R10-R19/R22 | MS07-MS17 |
| SA2-Q-S06 / SA1-Q-S3 | (a): both approximate/shallow warnings plus tune.shallow | R4 | MS05 |
| SA2-Q-S07 / SA1-Q-S6 | History entry ratingVersion, truthful earlier-version note, history store stays 1; no exported floor | R22 | MS17 |
| SA2-Q-S08 | R10 cost table B; ALS in existing chain group; no global raw-cost monotonicity assertion | R8/R10/R18/R19 | MS07-MS16 |
| SA2-Q-S09 | (a): existing cageCombo retained, quick tests for both interactions, no cageLocked | R17 | MS14 |
| SA2-Q-S10 | (a): keep priors and historical v2 records, add v3 expectations and explain reclassification | R1/R20/R22 | MS01/MS03/MS07-MS17 |
| SA2-Q-S11 | (a): bounded curated real help examples; stop/report if one cannot be obtained | R10/R21 | MS04/MS07-MS16 |
| SA2-Q-S12 | (c): R5's six-cell measured common cap; existing caps until measured; no unconditional 128 | R5/R23 | MS05/MS18 |
| SA1-Q-S5 | (a): accept final offered levels, no intermediate pruning or weight calibration | R24 | MS07/MS18 |
| AUTH-S1 | (a): archive v2 under v3, update live table in place; no reader-path change | R24 | MS18 |
| AUTH-S2 | (a): tooling MS04 before orders MS03 | R21 | MS04/MS03 |
| PROC-S1 | (a): baseline/tooling, S2.1, S1, S2.2, S3, S2.3; qualification at MS07/MS18 | R8/R21/R24 | all |
| Guided-oracle tierUsed row | Steering proxy only; uniqueness assumptions differ from canonical rating | R2/R6 | MS05/MS06 |
| Nightmare factual row | Agreed 0/12 versus 2/12 exact; 6/12 floor-stuck is a different predicate | Section 2.3/R9 | MS02/MS07 |
| Hash/golden/help ownership row | Refresh in each output-changing task; complete checkpoint evidence additionally | R21, section 6 | MS03/MS05-MS18 as affected |
| Subset counter row | Reset per call before certificate activation; test call-history independence | R8 | MS03 |
| Clarifications part D, items 1-16 | All accepted; item 13 replaced by the measured-cap answer | Section 4 and its R mapping | all affected tasks |

### 8.2 Plan coverage

| Plan section | Resolutions | Tasks | Clarification IDs |
|---|---|---|---|
| 1.3 fixed decisions / vocabulary | R1-R3, R7, R22-R24 | all | SA1-Q-S2, SA1-Q-S5 |
| S0.1 tier/certificate | R1/R2/R8/R20 | MS01, MS03, MS05 | SA2-Q-S01, SA2-Q-S02, SA1-Q-S7, SA2-Q-S10 |
| S0.2 columns/baseline | R23 | MS02, MS05, MS18 | PROC-S1 |
| S1.1 exactness/keeper/search | R2-R5 | MS05 | SA1-Q-S7, SA2-Q-S02, SA2-Q-S12 |
| S1.1 warnings/consumers | R4/R22 | MS05, MS17 | SA1-Q-S3, SA2-Q-S06, SA1-Q-S6, SA2-Q-S07 |
| S1.2 target/comparator/refine | R6/R7 | MS06, MS18 | SA1-Q-S4, SA2-Q-S03 |
| S2.1 order | R8/R21 | MS03/MS04 | PROC-S1, AUTH-S2 |
| S2.2 split IDs | R9/R10/R21 | MS07, MS18 | SA1-Q-S1, SA2-Q-S04, SA2-Q-S08 |
| S3 common requirements | R10/R20/R21 | MS07-MS16 | SA2-Q-S05, SA2-Q-S08, SA2-Q-S10, SA2-Q-S11 |
| S3 group 1 | R11 | MS08 | SA2-Q-S05/08/10/11 |
| S3 group 2 | R12 | MS09 | SA2-Q-S05/08/10/11 |
| S3 group 3 | R13/R14 | MS10/MS11 | SA2-Q-S05/08/10/11 |
| S3 group 4 | R15/R16 | MS12/MS13 | SA2-Q-S05/08/10/11 |
| S3 group 5 | R17/R21 | MS14 | SA2-Q-S05, SA2-Q-S09, SA2-Q-S11 |
| S3 group 6 | R18/R19 | MS15/MS16 | SA2-Q-S05/08/10/11 |
| S2.3 version/cache/history/docs | R20/R22/R24 | MS17/MS18 | SA1-Q-S6, SA2-Q-S07, SA2-Q-S10, AUTH-S1 |
| All APPROVAL GATE runs | R21/R23/R24; section 6 | owning task, MS07/MS18 checkpoints | PROC-S1, AUTH-S1, AUTH-S2 |
| Plan orientation/rules/checklist errata | section 4 and corresponding resolutions | all affected tasks | Clarifications part D |

## 9. Remaining concerns for acceptance

### AC01 — "attainable range" is a diagnostic lower bound, not a reachability guarantee

The owner's target scope and the author's interval formula are both applied. Two literal implications
of SA2-Q-S03's wording need acceptance of the qualification stated in R7/R23:

1. `1.25*w_min(tier)+V` is a lower bound on the **unrounded** score of a nonvacuously required puzzle,
   not a proved minimum reachable by this generator. `breakdown` returns both an unrounded sum and
   `Math.round(unrounded)` (`generator/js/engine/difficulty.js:239-268`). The tier may be empty, and
   VeryEasy is explicitly vacuous under SA2-Q-S01. Thus a universally finite adjusted position, or
   guaranteed confinement of every rounded/shallow score to that interval, does not follow.
2. The sentence "a target below the attainable range simply selects the lowest attainable puzzle"
   cannot mean a guaranteed global optimum while also preserving the approved first-exact stop,
   the 64-rating refinement cap and the other attempt caps
   (`generator/js/engine/digger.js:630-641,1100-1147,1667-1739`). Bounded search can only prefer a
   nearer score among the candidates it reaches.

**Acceptance requested:** retain the exact approved interval where defined, label it an analytic
attainable lower bound, report null/reason for undefined adjusted positions and leave defined values
unclamped. Describe a below-bound target as steering toward the lowest reachable/encountered scores,
not guaranteeing a global minimum. These are explicit reporting/wording qualifications, not a change
to target sampling, first-exact stopping, weights or budgets. R23 records them rather than silently
altering the author's formula.

No other infeasible or contradictory answer was found in the code read for this revision. The cap
and cutoff values remain future measurement outcomes under fully selected rules, not unanswered
design choices. No test run or generation probe was used to claim new v3 performance.

## 10. Acceptance and sign-off record

Acceptance covers the selected model and bounded solver capabilities, changed labels/hints and
possible removed levels, the evidence/gate obligations and expected effort, and AC01's explicit
measurement qualification. It does not assert that the future implementation or heavy gates have
passed. The task pack remains paused until the owner and plan author accept these reports.

| Sign-off | Status |
|---|---|
| SA2, gpt-6-astra | **signed**, 2026-11-12; answers at `1398dde` applied, with AC01 disclosed for acceptance. |
| SA1, claude-opus-5.5 | **signed (V1-V2 applied in this revision)**, 2026-11-12; editorial only, no resolution changed; AC01 agreed (`claude-opus-5.5/5-check-of-final-report.md`). |
| Owner and plan author | Awaiting acceptance; no task-pack or implementation work has resumed. |
