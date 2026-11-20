# MS06b — Pure target and comparison primitives

| Header | Value |
|---|---|
| Depends on | MS06a accepted |
| Size / active time | Medium; 35-50 minutes |
| Owner / milestone | Generator; M6b tested policy, not activated |
| Authority | R3/R6/R7; CV6-05 sign-target handoff |
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
Default cells generation is not yet a caller of the target policy. Under CV6-05 the restored registered
`signs` strategy has no target consumer: it receives the option through this unchanged forwarding
and ignores it. No edit to `greater-than.js`; MS06c1's keeper view carries its candidates' target.

Resume anchors at `c9935cd`: `generator/js/engine/digger.js:671` (`removalObjective`),
`:1681` (`distanceToLevel`), `:1717` (`qualityOf`), `:1999` (`SG.digger`),
and `digLevelSteps`/`const resolved` at 1304/1324. Find these symbols after r5p.
Preserve r3's `enterLocal`/`leaveLocal` and `rateCounted` accounting; no helper changes the 256 allowance
or the size-default attempts.

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
activates targets in the stages that compare candidates. The first-allowed sign pass transports,
but does not consume, its option; Greater-Than's later local/attemptBest continuation uses the
originating target. No guided-only or other partial intermediate production policy is permitted.

## Resume rules — S-OD4

Review: analyst cross-review. Stop for correctness (including wrong flags/warnings or corrupt evidence)
or a recorded-decision change; time/availability is a named numerical item for MS07e then MS18c/MS18d.
Continue within existing bounds; no new slow-cell evidence/tooling class and no false green result.
Every possibly >10-second payload uses `Invoke-Dv3Node`, <=540 s; preflight suite combinations
and use r5's complete bounded quick manifest, not an unmeasured replay/steps compound run.
Own the new `digger-target` suite's CI group/manifest entry after r6c, in addition to the file list.
Return the inherited/new item list, actual quick coverage and CI membership.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (SA1 verdict: accept; IR31/IR32 carried to MS06c1 as binding items instead of a fix round) |
| Start | 2026-11-14 18:12 (+07:00) |
| End | 2026-11-14 18:40 developer; 18:42-18:58 SA1 implementation review (`claude-opus-5.5/12-review-of-ms06b.md`); orchestrator acceptance and commit |
| Duration | 28 min developer (final quick runs: four locked Generator groups, shard sum 652.9 s; Player 31.9 s); about 16 min review |
| Model | claude-sonnet-5.5 (developer); claude-opus-5.5 (SA1 review); claude-opus-5.5 (orchestrator) |
| Token usage | 122 model calls; 23,906,391 input tokens (23,621,358 cache reads); 97,154 output tokens |
| AI credits | about 405 (developer) |
| Verification | Developer: `SG.digger.targetPolicy` (`targetFor`, `preferObjective`, `applyBounded`, `preferRated`, `acceptReveal`) and the single forwarding line `if (hasOwnProperty.call(options, 'target')) resolved.target = options.target;`; new suite `digger-target` (28 tests: every task vector, table row and tie; forwarding spy [true,812], [true,null], [false,undefined], [true,0] with identical givens, rating, stats, log and rng position; helpers never called across `generate` at easy/normal/expert; mutation check of the forwarding line). Final quick runs on the final tree, one group per locked command: Generator 3,290/3,290 in 4 groups (`shared-small` 1,464, 60.5 s; `own-suites` 1,607, 165.6 s; `pipeline` 150, 290.2 s; `replay-player` 69, 139.5 s; fingerprint `bae3ceb6…`), Player 1,683/1,683 (`28fc49a4…`); results in `docs/difficulty-v3/evidence/MS06b/quick/`. SA1 recomputed both fingerprints for the current tree. Orchestrator: locked focused re-run `--suite=digger-target,digger,replay,steps,ui-contract,help` 399/399 (26.7 s); `generator-suites.sh check` exit 0 (3,290 of 3,290 in exactly one shard, every job inside its limit; IR37) |
| Acceptance | MS06b's business and technical criteria met (SA1: all five helpers match the task's tables and vectors exactly; the forwarding line is the only production-path change and is inert for every default request; `greater-than.js` untouched, per CV6-05). CI: new shard `digger-target` (bound 30 s, measured 0.7 s) in group `own-suites` (projected 930 s of 1,800 s). Documentation: `generator/design.md` section 6.8 and 15.2, both developer guides; counts 35 own suites, 51 quick suites, 3,290 tests, 59 suites |
| Issues & resolutions | (1) The developer's three choices within the spec (`preferObjective` false unless both objectives succeed and are of the same kind; a non-finite target acts as no target; hell2 tested with a literal spec) are allowed by the spec (SA1), no routing. (2) IR31 Minor: `acceptReveal`'s floor check is not exercised on its own -> binding for MS06c1 (add the target-705 case: exact 730 -> 699 false, 730 -> 701 true). (3) IR32 Minor: `generator/design.md:719` names a non-existent "no sign is added back" rule; the real guard is that no clue is added to a model with signs -> binding for MS06c1. (4) IR33/IR36 Info: a misleading test name; the Vietnamese guide lacks the link to section 6.8 -> MS06c1. (5) IR34/IR38 Info: a lost target is indistinguishable from no target, and `generate` copies a caller's `options.target` into every sample -> MS06c2's transport tests must stay strict and override with each sample's own draw. (6) IR35 Info: the hell2 literal could use `SG.difficulty.bandOf('hell2')` (optional). (7) IR37: the CI check was run by the orchestrator; quick results moved from `generator/tests/artifacts/` to `evidence/MS06b/quick/` |
| Handoff | MS06c1: binding IR31, IR32, IR33 (rename or make a success win), IR36; optional IR35. MS06c2: IR34, IR38; seed each pool's incumbent with its first success; CC02 (the `digger-target` shard measured 0.7 s; a real Greater-Than Expert request fits the 30 s bound only with a short seed). Items unchanged; S-AV08 standing cost now 652.9 s |
