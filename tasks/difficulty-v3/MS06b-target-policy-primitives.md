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

In: pure helper seam and focused tests, documentation. Out: calling it from production generation,
new RNG draws, changed outputs, gates or new files in application script lists.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. Classic engine helpers, no DOM, no configuration option for
turning the accepted policy off. This preparatory task leaves production paths unchanged.

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
acceptReveal(current,next,spec,target,nextIsExact) -> boolean
```

`preferRated`: lower R3 quality wins; equal quality prefers nearer finite target, otherwise higher
score; exact ties false. Use explicit comparisons, not Infinity-Infinity subtraction.
Refinement is entered only from above band. While still above band retain the existing solved/
score>=min reveal rule. After crossing in-band required, accept only an in-band required reveal
strictly nearer target while above it. Shallow/under-minimum/non-improving reveals are undone.
The same 64-rating cap and no-sign-additions guard remain the caller's responsibility.

Vectors: target=500, tier-used 650 beats non-tier 500; tier-used 550 and 450 tie; false/false 650->700
is allowed despite distance; true/true 550->600 is refused. R3 quality 0/score430 beats quality
0.5/score500. Proposal `STUCK_SCORE+9` beats `STUCK_SCORE+2`, irrespective of target.

Baseline anchors: `generator/js/engine/digger.js:652-703` (`function removalObjective`),
`:1507-1518` (`function distanceToLevel`), `:1763-1781` (`SG.digger = {`).

## Files to create/modify

- `generator/js/engine/digger.js`; new `generator/tests/suites/digger-target.test.js`;
  `generator/tests.html` suite list.
- Generator design 6.8 and both developer guides: internal policy API, explicitly not yet wired.

## Implementation steps

1. Add helpers without changing any existing caller.
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
| MS06b-T03 | Pure helpers remain unused by production; both quick sets pass |

## Test plan

Generator: `node tests\node-runner.js --suite=digger-target,digger,replay,steps,ui-contract,help`;
then both app quick sets. Test RNG next=0 and next approaching 1, infinite upper bound, non-improving
exact reveal, tier-losing reveal, and quality Infinity. No heavy gate.

## Definition of done & handoff

MS06c receives the exact helper contracts and vectors. Do not activate only guided targeting as
an intermediate user-visible policy; the next task connects all stages together.

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
