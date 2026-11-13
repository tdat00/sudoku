# MS06b — Pure target and comparison primitives

| Header | Value |
|---|---|
| Depends on | MS06a accepted |
| Size / active time | Medium; 35-50 minutes |
| Owner / milestone | Generator; M6b tested policy, not activated |
| Authority | R3/R6/R7 |
| Status | Not started |

## Goal & business context

Test every ranking/stop rule before wiring the full three-stage change. Keep proposals separate
from scores and prevent a closer shallow candidate from defeating a required one.

## Scope

In: pure helper seam, focused tests and documentation; the sole production-path edit is inert
forwarding of an explicitly present `options.target` to a dig strategy. Out: calling the policy
helpers from normal generation, new production RNG draws, changed default outputs, gates or
new files in application script lists.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. Classic engine helpers, no DOM, no configuration option for
turning the accepted policy off. The forwarding line changes no default request because no
production caller supplies a target yet; it must be tested, not described as an unused helper.

## Inputs & context

R6, verbatim:

```text
target = null if spec.max == Infinity
       = spec.min + rng.fork('target').next() * (spec.max-spec.min) otherwise
{kind:'refused', reason}
{kind:'bounded', score, tierUsed}
{kind:'proposal', priority}
```

| Current tierUsed | Winner tierUsed | Apply? |
|---|---|---|
| true | false | never |
| false | true | yes |
| false | false | yes, continue seeking the tier |
| true | true, finite target | only if target distance strictly improves |
| true | true, null target | yes, preserve the unbounded-level digging policy |

Within a bounded pool prefer tierUsed, then nearer finite target or higher score for null.
Exact ties keep the first seeded candidate. Proposals maximize priority; mixed kinds are not
comparable score values. Refusals never win.

Add a pure `SG.digger.targetPolicy` seam in the existing module:

```text
targetFor(spec,rng) -> number|null
preferObjective(candidate, incumbent, target) -> boolean // strict, same successful kind
applyBounded(current, winner, target) -> boolean
preferRated(candidateQuality,candidateScore,currentQuality,currentScore,target) -> boolean
acceptReveal(current,next,spec,target,currentIsExact,nextIsExact) -> boolean
```

`preferRated`: lower R3 quality wins; equal quality prefers nearer finite target, otherwise higher
score; exact ties false. Use explicit comparisons, not Infinity-Infinity subtraction.
Refinement is entered only from above band. While still above band retain the existing solved/
score>=min reveal rule. After crossing in-band required, accept only an in-band required reveal
strictly nearer target while above it. Shallow/under-minimum/non-improving reveals are undone.
`current` and `next` are rating-like `{solved, score}` values, not quality numbers. `currentIsExact`
and `nextIsExact` are computed by the caller on each candidate's model; the helper never rates or
derives requiredness. The exact predicate is:

```text
if either rating is not solved or has a non-finite score: false
if current.score >= spec.max: next.score >= spec.min
otherwise: current is in band, currentIsExact and nextIsExact,
           finite target, current.score > target,
           spec.min <= next.score < spec.max,
           abs(next.score - target) < abs(current.score - target)
```

In-band shallow input therefore cannot be polished by refinement; the caller continues local
search instead. The same 64-rating cap and no-sign-additions guard remain the caller's responsibility.

Vectors: target=500, tier-used 650 beats non-tier 500; tier-used 550 and 450 tie; false/false 650->700
is allowed despite distance; true/true 550->600 is refused. R3 quality 0/score 430 beats quality
0.5/score 500. Proposal `STUCK_SCORE+9` beats `STUCK_SCORE+2`, irrespective of target.

Reveal vectors use `spec = {min:700, max:1000}` (Expert), target 850, all ratings solved unless
stated otherwise: 1100 -> 920 is allowed while above band; 920 exact -> 880 exact is allowed;
**880 exact -> 900 exact** is not nearer and is refused; 920 exact -> 840 shallow is refused;
920 exact -> 690 is below minimum and refused; 800 exact is already below target and cannot
start another reveal; 920 shallow cannot be refined further. This makes the sequential origin
of the "900 is not nearer" vector explicit: 920 -> 900 would in fact improve distance.

### Inert strategy forwarding (FS20)

In `digLevelSteps`, immediately after `const resolved = { ... }`, add:

```js
if (Object.prototype.hasOwnProperty.call(options, 'target')) resolved.target = options.target;
```

No truthiness check or default assignment: explicit null and absence differ. Do not draw a target
here or elsewhere in normal generation in this task. MS06c1 prepares nullable transport only;
MS06c2 creates and activates the one production sample target atomically in all stages.

Test through the existing `options.strategy` seam, not a new export: a spy records
`Object.prototype.hasOwnProperty.call(opts, 'target')` and `opts.target`, then delegates to
`SG.digger.getStrategy('cells')`. On the same fixed small model/solution/seed run
`SG.digger.digLevel(model, solution, level, rng, options)` three times with target 812, target null
and no property. Expect `[true,812]`, `[true,null]`, `[false,undefined]`, and identical givens,
rating, statistics and old log operations. Use a fresh `SG.rng.create(seed)` each time.
Default cells generation is not yet a caller of the target policy; the `signs` pool's explicit
target handling is already owned/tested by MS05e.

Baseline anchors: `generator/js/engine/digger.js:652-703` (`function removalObjective`),
`:1507-1518` (`function distanceToLevel`), `:1763-1781` (`SG.digger = {`) at `2c665bb`;
`const resolved =` is at `:1192-1206` at `f788e02`. Find quotes after MS05 changes.

## Files to create/modify

- `generator/js/engine/digger.js`; new `generator/tests/suites/digger-target.test.js`;
  `generator/tests.html` suite list.
- Generator design 6.8 and both developer guides: internal policy API, explicitly not yet wired.

## Implementation steps

1. Add unused pure policy helpers. Make the sole production-path edit shown above, with the
   three-way forwarding test; no caller starts supplying a new target and no target is drawn.
2. Encode all table rows and stable ties; keep proposal comparison a different branch.
3. Test target fork isolation and refinement's conditional continuation.
4. Document helper signatures; verify existing generation/replay output stays unchanged.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS06b-B01 | Required tier has priority over cosmetic target proximity |
| MS06b-B02 | A proposal is never mistaken for a score |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS06b-T01 | Every table row/vector, refusal, null target and equal tie is covered |
| MS06b-T02 | Only target child draws change; random/guided parent streams do not |
| MS06b-T03 | Pure policy helpers remain unused by normal production; the explicit target/null/absent forwarding spy passes with identical default outputs; both quick sets pass |

## Test plan

Generator: `node tests\node-runner.js --suite=digger-target,digger,replay,steps,ui-contract,help`;
then both app quick sets. Test RNG next=0 and next approaching 1, infinite upper bound, non-improving
exact reveal, tier-losing reveal, and quality Infinity. Include every explicit reveal/forwarding
vector above, not just comparator tests. No heavy gate. Use the checklist lock for possibly
>10-second quick commands.

## Definition of done & handoff

MS06c1 receives the exact helper/forwarding contracts for inactive transport. MS06c2 draws and
activates targets in all stages, including the sign strategy. No guided-only or sign-only
intermediate production policy is permitted.

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
