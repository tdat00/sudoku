# MS08c — Restricted empty rectangle

| Header | Value |
|---|---|
| Depends on | MS08b accepted |
| Size / active time | Medium; 50-60 minutes plus gates |
| Owner / milestone | Shared fish / both apps; M8 complete |
| Authority | R10/R11/R20/R21 |
| Status | Not started |

## Goal & business context

Add the bounded empty-rectangle grouped implication without waiting for the general grouped graph.
Every member of an arm matters to the proof.

## Scope

In: the restricted R11 form and full B. Out: broader rectangle variants or grouped-chain activation.

## Repository rules

AGENTS/checklist; no Git/pack/log writes; real help, both languages, CRLF, named gates only.

## Inputs & context

R11, verbatim:

> A complete box's candidates split into disjoint nonempty row/column arms A/B, empty intersection.
> External conjugate pair p/q has p conflicting with every occurrence in A; then B or q is true.
> Eliminate only where every B occurrence and q are seen.

Register emptyRectangle: fish, order124, weight380, baseCost38, unscoped, no uniqueness.
Both external pair cells are outside the box. Reject a candidate at the empty intersection and
three-line boxes; test both arm orientations/transposes. Use safe owner tables and complete units.
Finding key `technique.emptyRectangle.step`; args `{digit,box:string,lines:string[],ends:string[]}`;
normal R10 Finding fields, sorted owned cells/eliminations, no placements.

Vector: box B1 digit5 arms A={R2C1,R2C3}, B={R1C2,R3C2}, no5 at R2C2.
External column-C5 pair p=R2C5,q=R7C5 gives elimination5 at R7C2.
Adding5 at the intersection or outside the arms invalidates this restricted witness.
Missing visibility to R3C2 must invalidate the target, even if it sees R1C2.

Limit50000 tested arm/pair/target extensions; entry/every256 checks, reset each call, report metrics.
Incomplete support search never supplies a false group claim.
Baseline `core/js/engine/tech-fish.js:56-125` (ownership), `:309-335` (`function findStrongLinks`);
current R10 integration is the B contract.

## Files to create/modify

- Fish engine/suite; full B and E; applicable Generator/Player design and both language guides.

## Implementation steps

1. Build complete-box arm records and exact external conjugates.
2. Test the constructive implication independently and all near-miss visibility cases.
3. Register/integrate with two real exact-Finding positives, negative and real Player example.
4. Record current reference changes, cost/cap evidence and complete output refreshes.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS08c-B01 | The named grouped proof is explained and never treats one arm member as the whole arm |
| MS08c-B02 | No unsupported rectangle variant is advertised |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS08c-T01 | Empty intersection, complete box/pair, externality and every-member visibility hold |
| MS08c-T02 | Transposes, partial/overlap/three-line negatives, immutability and cancellation pass |
| MS08c-T03 | Full B/E/GH/cost and quick sets pass |

## Test plan and gates

Generator `node tests\node-runner.js --suite=tech-fish,techniques,technique-weights,difficulty-floor`;
Player `--suite=help,play,i18n`; both quick sets. Complete E, MS08c:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS08c\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS08c\analysis\G01.json
node tests\pattern-cost.js --ids=emptyRectangle --runs=20 --json=..\docs\difficulty-v3\evidence\MS08c\pattern-cost.json
```

Player GH after B source acquisition:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=emptyRectangle --sources=tests\artifacts\difficulty-v3\MS08c\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=emptyRectangle --sources=tests\artifacts\difficulty-v3\MS08c\sources.json --max-puzzles=8 --max-hints=400 --check
```

Prefer existing forcingChain/colour sources, then bounded classic9 hard/expert. Jobs1/no --jobs;
E10-90 minutes, cost1-30 seconds, curated GH1-120 seconds; discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
At most one evidenced own-limit change; stop any command at ten minutes.

## Definition of done & handoff

Report the restricted coverage, source and all-member proof cases. M8 is complete only with all
three IDs integrated and current references truthful.

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
